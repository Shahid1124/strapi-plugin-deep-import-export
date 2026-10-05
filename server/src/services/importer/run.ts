import { createHash } from "node:crypto"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { readDocumentArray } from "../archive/json-stream"
import { readZip } from "../archive/zip"
import { executeImport, prepareImport, type ExecuteResult } from "../importer/execute"
import { matchMedia, type StoredMedia } from "../media/match"
import type { SchemaSource } from "../schema/types"
import type { ExportedDocument, ImportOptions, Manifest, MediaRef, SchemaSnapshotFile } from "../serializer/types"
import { PACKAGE_FILES } from "../utils/constants"
import { ImportExportError, issue, type StructuredIssue } from "../utils/errors"
import { validatePackage } from "../validation/validate"
import type { WritePorts } from "../importer/execute"

export interface OpenedPackage {
  manifest: Manifest
  documents: ExportedDocument[]
  schemas?: SchemaSnapshotFile
  mediaDir: string
  issues: StructuredIssue[]
}

export const openPackage = async (zipPath: string, workDir: string, maxBytes: number): Promise<OpenedPackage> => {
  const entries = await readZip(zipPath, maxBytes)
  const byName = new Map(entries.map((entry) => [entry.name, entry.data]))
  const manifestBuffer = byName.get(PACKAGE_FILES.manifest)
  const dataBuffer = byName.get(PACKAGE_FILES.data)
  if (!manifestBuffer || !dataBuffer) {
    throw new ImportExportError("The archive is missing manifest.json or data.json.", "MALFORMED_PACKAGE")
  }
  let manifest: Manifest
  try {
    manifest = JSON.parse(manifestBuffer.toString("utf8")) as Manifest
  } catch {
    throw new ImportExportError("manifest.json is not valid JSON.", "MALFORMED_MANIFEST")
  }
  let schemas: SchemaSnapshotFile | undefined
  const schemaBuffer = byName.get(PACKAGE_FILES.schemas)
  if (schemaBuffer) {
    try {
      schemas = JSON.parse(schemaBuffer.toString("utf8")) as SchemaSnapshotFile
    } catch {
      throw new ImportExportError("schemas.json is not valid JSON.", "MALFORMED_SCHEMA")
    }
  }
  const mediaDir = path.join(workDir, "media")
  await mkdir(mediaDir, { recursive: true })
  for (const [name, data] of byName) {
    if (!name.startsWith("media/")) {
      continue
    }
    await writeFile(path.join(workDir, name), data)
  }
  const dataPath = path.join(workDir, PACKAGE_FILES.data)
  await writeFile(dataPath, dataBuffer)
  const documents: ExportedDocument[] = []
  await readDocumentArray(dataPath, (document) => {
    documents.push(document as ExportedDocument)
  })
  return { manifest, documents, schemas, mediaDir: workDir, issues: [] }
}

export interface ImportRuntime {
  source: SchemaSource
  ports: WritePorts
  findMediaCandidates: (media: MediaRef) => Promise<StoredMedia[]>
  rememberMedia: (sha256: string, media: StoredMedia) => Promise<void>
  uploadMedia: (media: MediaRef, bytes: Buffer) => Promise<StoredMedia>
  deleteMedia: (id: number) => Promise<void>
  publishing: boolean
}

export interface ImportRunResult {
  preview: {
    stats: {
      contentTypes: number
      entries: number
      components: number
      dynamicZones: number
      relations: number
      media: number
    }
    conflicts: Awaited<ReturnType<typeof prepareImport>>["conflicts"]
    issues: StructuredIssue[]
    blocked: boolean
  }
  execution?: ExecuteResult
}

const mediaKey = (media: MediaRef): string => media.sha256 || media.key || media.hash || `${media.name}:${media.sizeInBytes ?? media.size ?? ""}`

export const runImport = async (
  opened: OpenedPackage,
  options: ImportOptions,
  runtime: ImportRuntime,
  onProgress?: (stage: string, done: number, total: number) => void
): Promise<ImportRunResult> => {
  const validation = validatePackage(opened.manifest, opened.documents, opened.schemas, runtime.source, options.publishMode !== "draft")
  const prepared = await prepareImport(validation.documents, runtime.source, options, runtime.ports)
  const issues = [...validation.issues, ...prepared.issues]
  const blocked = issues.some((item) => item.level === "error") || prepared.blocked
  const preview = {
    stats: validation.stats,
    conflicts: prepared.conflicts,
    issues,
    blocked,
  }
  if (options.dryRun || blocked) {
    return { preview }
  }

  const mediaIds = new Map<string, number>()
  const uploadedIds: number[] = []
  const media = prepared.media
  for (const [index, ref] of media.entries()) {
    const candidates = await runtime.findMediaCandidates(ref)
    const matched = matchMedia(ref, candidates)
    if (matched) {
      for (const key of [ref.sha256, ref.key, ref.hash, mediaKey(ref)]) {
        if (key) {
          mediaIds.set(key, matched.id)
        }
      }
      onProgress?.("media", index + 1, media.length)
      continue
    }
    if (!ref.key || !opened.manifest.includeMedia) {
      issues.push(
        issue("warning", "MISSING_MEDIA", `Media "${ref.name}" was not in the archive and no matching file exists in this library.`, {
          name: ref.name,
          hash: ref.hash,
        })
      )
      continue
    }
    const filePath = path.join(opened.mediaDir, ref.key)
    const bytes = await readFile(filePath)
    const sha256 = createHash("sha256").update(bytes).digest("hex")
    if (ref.sha256 && ref.sha256 !== sha256) {
      throw new ImportExportError(`Media file ${ref.key} does not match its recorded checksum.`, "MEDIA_CHECKSUM", {
        key: ref.key,
      })
    }
    ref.sha256 = sha256
    const again = matchMedia(ref, candidates)
    if (again) {
      mediaIds.set(sha256, again.id)
      mediaIds.set(mediaKey(ref), again.id)
      if (ref.key) {
        mediaIds.set(ref.key, again.id)
      }
      continue
    }
    const stored = await runtime.uploadMedia(ref, bytes)
    uploadedIds.push(stored.id)
    await runtime.rememberMedia(sha256, stored)
    for (const key of [sha256, ref.key, ref.hash, mediaKey(ref)]) {
      if (key) {
        mediaIds.set(key, stored.id)
      }
    }
    onProgress?.("media", index + 1, media.length)
  }

  const execution = await executeImport(validation.documents, runtime.source, options, runtime.ports, mediaIds, onProgress)
  if (execution.rollback.attempted) {
    for (const id of uploadedIds) {
      try {
        await runtime.deleteMedia(id)
      } catch (error) {
        execution.rollback.completed = false
        execution.rollback.failures.push(
          `Could not delete uploaded media ${id}: ${error instanceof Error ? error.message : "unknown error"}`
        )
      }
    }
  }
  execution.issues.push(...issues.filter((item) => item.level === "warning"))
  return { preview, execution }
}

export const removeWorkDir = async (directory: string): Promise<void> => {
  await rm(directory, { recursive: true, force: true })
}
