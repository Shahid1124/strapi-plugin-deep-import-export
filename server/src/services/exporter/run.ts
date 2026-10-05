import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { DocumentJsonWriter } from "../archive/json-stream"
import { sanitizeFileName, ZipWriter } from "../archive/zip"
import { hasDraftAndPublish, identityFields, isLocalized } from "../schema/attributes"
import { buildPopulate } from "../schema/populate"
import { buildSchemaSnapshot } from "../schema/snapshot"
import type { SchemaSource } from "../schema/types"
import { createSerializeContext, serializeAttributes } from "../serializer/serialize"
import { emptyStats, type ExportStats } from "../serializer/types"
import { FORMAT_VERSION, PACKAGE_FILES } from "../utils/constants"
import { ImportExportError } from "../utils/errors"
import type { ExportedDocument, ExportedLocale, Manifest, MediaRef, PublicationState } from "../serializer/types"

export interface ExportSelection {
  contentTypes: string[]
  documentIds?: string[]
  filters?: Record<string, unknown>
  includeMedia: boolean
  includeRelations: boolean
  locales?: string[]
  status: "draft" | "published" | "both"
  archiveName?: string
}

export interface ExportDependencies {
  source: SchemaSource
  strapiVersion: string
  environment: string
  maxDepth: number
  batchSize: number
  listLocales: () => Promise<{ codes: string[]; defaultLocale: string | null }>
  findPage: (input: {
    uid: string
    status: "draft" | "published"
    locale: string | null
    page: number
    pageSize: number
    populate?: Record<string, unknown>
    filters?: Record<string, unknown>
  }) => Promise<Array<Record<string, unknown>>>
  readMedia: (file: Record<string, unknown>) => Promise<Buffer>
  onProgress: (stage: string, done: number, total: number) => Promise<void> | void
}

const stable = (value: unknown): string => JSON.stringify(value)

const publicationState = (draft: Record<string, unknown> | null, published: Record<string, unknown> | null, enabled: boolean): PublicationState => {
  if (!enabled) {
    return "unversioned"
  }
  if (draft && published) {
    return stable(draft) === stable(published) ? "published" : "modified"
  }
  if (published) {
    return "published"
  }
  return "draft"
}

const versionData = (
  raw: Record<string, unknown> | undefined,
  modelUid: string,
  source: SchemaSource,
  includeRelations: boolean,
  maxDepth: number,
  onMedia: (rawMedia: Record<string, unknown>, ref: MediaRef) => void,
  stats?: ExportStats
): Record<string, unknown> | null => {
  if (!raw) {
    return null
  }
  const model = source.getModel(modelUid)
  if (!model) {
    return null
  }
  const context = createSerializeContext(source, { includeRelations, maxDepth })
  if (stats) {
    context.stats = stats
  }
  context.onMedia = onMedia
  return serializeAttributes(raw, model, context)
}

export const runExport = async (
  selection: ExportSelection,
  directory: string,
  dependencies: ExportDependencies
): Promise<{ filePath: string; manifest: Manifest }> => {
  if (!selection.contentTypes.length) {
    throw new ImportExportError("Select at least one content type to export.", "EMPTY_SELECTION")
  }
  await mkdir(directory, { recursive: true })
  const mediaGroups = new Map<string, { ref: MediaRef; raw: Record<string, unknown> }[]>()
  const onMedia = (raw: Record<string, unknown>, ref: MediaRef) => {
    const groupKey = String(raw.hash || raw.documentId || raw.id || ref.name)
    const group = mediaGroups.get(groupKey) ?? []
    group.push({ ref, raw })
    mediaGroups.set(groupKey, group)
  }

  const documents: ExportedDocument[] = []
  const stats = emptyStats()
  const localeInfo = await dependencies.listLocales()
  let entryDone = 0
  const typeTotal = selection.contentTypes.length
  await dependencies.onProgress("contentTypes", 0, typeTotal)

  for (const [typeIndex, uid] of selection.contentTypes.entries()) {
    const model = dependencies.source.getModel(uid)
    if (!model || model.modelType !== "contentType") {
      throw new ImportExportError(`Content type ${uid} does not exist.`, "MISSING_CONTENT_TYPE", { uid })
    }
    const localized = isLocalized(model)
    const locales = localized
      ? (selection.locales?.length ? selection.locales : localeInfo.codes)
      : [null]
    const orderedLocales = [...locales].sort((left, right) => {
      if (left === localeInfo.defaultLocale) return -1
      if (right === localeInfo.defaultLocale) return 1
      return 0
    })
    const populate = buildPopulate(uid, dependencies.source, dependencies.maxDepth)
    const filters = { ...(selection.filters ?? {}) }
    if (selection.documentIds?.length) {
      filters.documentId = { $in: selection.documentIds }
    }
    const draftEnabled = hasDraftAndPublish(model)
    const statuses: Array<"draft" | "published"> =
      !draftEnabled || selection.status === "published"
        ? ["published"]
        : selection.status === "draft"
          ? ["draft"]
          : ["draft", "published"]

    const grouped = new Map<string, { draft?: Record<string, unknown>; published?: Record<string, unknown>; locale: string | null }>()
    for (const locale of orderedLocales) {
      for (const status of statuses) {
        let page = 1
        while (true) {
          const rows = await dependencies.findPage({
            uid,
            status,
            locale,
            page,
            pageSize: dependencies.batchSize,
            populate,
            filters,
          })
          if (!rows.length) {
            break
          }
          for (const row of rows) {
            const documentId = String(row.documentId ?? "")
            if (!documentId) {
              continue
            }
            const key = `${documentId}:${locale ?? ""}`
            const current = grouped.get(key) ?? { locale }
            current[status] = row
            grouped.set(key, current)
          }
          entryDone += rows.length
          await dependencies.onProgress("entries", entryDone, entryDone)
          if (rows.length < dependencies.batchSize) {
            break
          }
          page += 1
        }
      }
    }

    const byDocument = new Map<string, ExportedDocument>()
    for (const entry of grouped.values()) {
      const raw = entry.published ?? entry.draft
      if (!raw?.documentId) {
        continue
      }
      const documentId = String(raw.documentId)
      let document = byDocument.get(documentId)
      if (!document) {
        document = {
          uid,
          kind: model.kind === "singleType" ? "singleType" : "collectionType",
          documentId,
          identity: {},
          locales: [],
        }
        byDocument.set(documentId, document)
      }
      const countTarget = entry.published ? "published" : "draft"
      const draft = versionData(
        entry.draft,
        uid,
        dependencies.source,
        selection.includeRelations,
        dependencies.maxDepth,
        onMedia,
        countTarget === "draft" ? stats : undefined
      )
      const published = versionData(
        entry.published,
        uid,
        dependencies.source,
        selection.includeRelations,
        dependencies.maxDepth,
        onMedia,
        countTarget === "published" ? stats : undefined
      )
      const state = publicationState(draft, published, draftEnabled)
      const localeEntry: ExportedLocale = {
        locale: entry.locale,
        publicationState: state,
        draft: draft ? { data: draft } : null,
        published: published ? { data: published } : null,
      }
      document.locales.push(localeEntry)
      if (!Object.keys(document.identity).length) {
        const sourceData = published ?? draft ?? {}
        for (const field of identityFields(model)) {
          const value = sourceData[field]
          if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            document.identity[field] = value
          }
        }
      }
    }
    documents.push(...byDocument.values())
    await dependencies.onProgress("contentTypes", typeIndex + 1, typeTotal)
    await dependencies.onProgress("components", dependencies.source.components().length, dependencies.source.components().length)
  }

  const mediaDir = path.join(directory, "media")
  await mkdir(mediaDir, { recursive: true })
  let mediaIndex = 1
  const groups = [...mediaGroups.values()]
  for (const [index, group] of groups.entries()) {
    const raw = group[0].raw
    const ext = sanitizeFileName(typeof raw.ext === "string" ? raw.ext : path.extname(String(raw.name ?? "")))
    const base = sanitizeFileName(path.basename(String(raw.name ?? "file"), path.extname(String(raw.name ?? "file"))))
    const fileName = `${String(mediaIndex).padStart(4, "0")}-${base}${ext.startsWith(".") || !ext ? ext : `.${ext}`}`
    const key = `media/${fileName}`
    let sha256: string | undefined
    if (selection.includeMedia) {
      const bytes = await dependencies.readMedia(raw)
      sha256 = createHash("sha256").update(bytes).digest("hex")
      await writeFile(path.join(directory, key), bytes)
    }
    for (const item of group) {
      item.ref.key = key
      if (sha256) {
        item.ref.sha256 = sha256
      }
    }
    mediaIndex += 1
    await dependencies.onProgress("media", index + 1, groups.length)
  }
  await dependencies.onProgress("relations", stats.relationCount, stats.relationCount)

  const [major, minor] = dependencies.strapiVersion.split(".").map((part) => Number(part) || 0)
  const schemas = buildSchemaSnapshot(dependencies.source, selection.contentTypes)
  const manifest: Manifest = {
    formatVersion: FORMAT_VERSION,
    strapiVersion: dependencies.strapiVersion,
    strapiMajorVersion: major,
    strapiMinorVersion: minor,
    exportedAt: new Date().toISOString(),
    sourceEnvironment: dependencies.environment,
    locales: localeInfo.codes,
    contentTypes: selection.contentTypes,
    components: Object.keys(schemas.components),
    mediaCount: groups.length,
    relationCount: stats.relationCount,
    entryCount: documents.length,
    componentCount: stats.componentCount,
    dynamicZoneCount: stats.dynamicZoneCount,
    includeMedia: selection.includeMedia,
    includeRelations: selection.includeRelations,
    plugin: "deep-import-export",
  }
  const readme = [
    "# Strapi deep export",
    "",
    `Exported at ${manifest.exportedAt} from ${manifest.sourceEnvironment}.`,
    `Format ${manifest.formatVersion}, Strapi ${manifest.strapiVersion}.`,
    "",
    "This archive contains content documents, a schema snapshot, and optional media files.",
    "It does not contain secrets, API tokens, or environment configuration.",
    "",
    "Import it with the Deep Import / Export plugin on another Strapi 5 instance.",
    "",
  ].join("\n")

  const dataPath = path.join(directory, PACKAGE_FILES.data)
  const writer = new DocumentJsonWriter(dataPath)
  for (const document of documents) {
    await writer.writeDocument(document)
  }
  await writer.close()
  await writeFile(path.join(directory, PACKAGE_FILES.manifest), JSON.stringify(manifest, null, 2))
  await writeFile(path.join(directory, PACKAGE_FILES.schemas), JSON.stringify(schemas, null, 2))
  await writeFile(path.join(directory, PACKAGE_FILES.readme), readme)

  const base = sanitizeFileName((selection.archiveName || "strapi-export").replace(/\.zip$/i, ""))
  const zipPath = path.join(directory, `${base}.zip`)
  const zip = new ZipWriter(zipPath)
  await zip.addFile(PACKAGE_FILES.manifest, path.join(directory, PACKAGE_FILES.manifest))
  await zip.addFile(PACKAGE_FILES.data, dataPath)
  await zip.addFile(PACKAGE_FILES.schemas, path.join(directory, PACKAGE_FILES.schemas))
  await zip.addFile(PACKAGE_FILES.readme, path.join(directory, PACKAGE_FILES.readme))
  if (selection.includeMedia) {
    for (const group of groups) {
      const key = group[0].ref.key
      if (key) {
        await zip.addFile(key, path.join(directory, key))
      }
    }
  }
  await zip.close()
  return { filePath: zipPath, manifest }
}
