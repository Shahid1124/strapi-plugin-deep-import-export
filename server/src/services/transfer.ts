import { randomUUID } from "node:crypto"
import { createReadStream } from "node:fs"
import { mkdir, copyFile, open, rm, stat } from "node:fs/promises"
import path from "node:path"
import { PLUGIN_ID } from "./utils/constants"
import { ImportExportError, type StructuredIssue } from "./utils/errors"
import { labelFields } from "./schema/attributes"
import { isBlockedUid, schemaSourceFromStrapi } from "./schema/strapi-source"
import { runExport, type ExportSelection } from "./exporter/run"
import { openPackage, removeWorkDir, runImport } from "./importer/run"
import type { ConflictStrategy, ImportOptions, PublishMode, UnresolvedRelationPolicy } from "./serializer/types"
import {
  createWritePorts,
  deleteMedia,
  findMediaCandidates,
  findPage,
  listLocales,
  readPluginConfig,
  readUploadBytes,
  rememberMedia,
  storageRoot,
  uploadMediaFile,
  type AppStrapi,
} from "./strapi/runtime"

const JOB_UID = `plugin::${PLUGIN_ID}.job`

export interface PublicJob {
  documentId: string
  operation: string
  state: string
  startedAt?: string | null
  finishedAt?: string | null
  summary?: unknown
  progress?: unknown
  errors?: unknown
  warnings?: unknown
  rollback?: unknown
  downloadable: boolean
  filename?: string | null
}

const toPublic = (job: Record<string, unknown>): PublicJob => ({
  documentId: String(job.documentId),
  operation: String(job.operation),
  state: String(job.state),
  startedAt: (job.startedAt as string) ?? null,
  finishedAt: (job.finishedAt as string) ?? null,
  summary: job.summary ?? null,
  progress: job.progress ?? emptyProgress(),
  errors: job.errors ?? [],
  warnings: job.warnings ?? [],
  rollback: job.rollback ?? null,
  downloadable: Boolean(job.archivePath) && job.state === "completed" && job.operation === "export",
  filename: typeof job.archivePath === "string" ? path.basename(job.archivePath) : null,
})

const emptyProgress = () => ({
  contentTypes: { done: 0, total: 0 },
  entries: { done: 0, total: 0 },
  components: { done: 0, total: 0 },
  media: { done: 0, total: 0 },
  relations: { done: 0, total: 0 },
})

const removeJobFiles = async (strapi: AppStrapi, job: Record<string, unknown>) => {
  const root = path.resolve(storageRoot(strapi))
  const documentId = String(job.documentId ?? "")
  const targets = [
    path.join(root, "exports", documentId),
    path.join(root, "imports", documentId),
  ]
  if (typeof job.archivePath === "string") {
    const archive = path.resolve(job.archivePath)
    if (archive.startsWith(`${root}${path.sep}`)) {
      targets.push(archive, path.dirname(archive))
    }
  }
  for (const target of targets) {
    const resolved = path.resolve(target)
    if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
      continue
    }
    await rm(resolved, { recursive: true, force: true })
  }
}

const assertSafeId = (value: string): string => {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(value)) {
    throw new ImportExportError("The job id is not valid.", "INVALID_ID")
  }
  return value
}

export const createTransferService = (strapi: AppStrapi) => {
  const jobs = () => strapi.documents(JOB_UID)
  const progressByJob = new Map<string, ReturnType<typeof emptyProgress>>()

  const updateProgress = async (documentId: string, stage: string, done: number, total: number) => {
    const progress = progressByJob.get(documentId) ?? emptyProgress()
    progressByJob.set(documentId, progress)
    const bucket = progress[stage as keyof typeof progress]
    if (bucket) {
      bucket.done = done
      bucket.total = Math.max(total, done)
    }
    await jobs().update({
      documentId,
      data: {
        progress: {
          contentTypes: { ...progress.contentTypes },
          entries: { ...progress.entries },
          components: { ...progress.components },
          media: { ...progress.media },
          relations: { ...progress.relations },
        },
      },
    })
  }

  return {
    async contentTypes() {
      const source = schemaSourceFromStrapi(strapi)
      const localeInfo = await listLocales(strapi)
      return source.contentTypes().map((model) => ({
        uid: model.uid,
        displayName: model.displayName ?? model.uid,
        kind: model.kind ?? "collectionType",
        draftAndPublish: Boolean(model.options?.draftAndPublish),
        localized: Boolean(model.pluginOptions?.i18n?.localized),
        locales: model.pluginOptions?.i18n?.localized ? localeInfo.codes : [],
        defaultLocale: localeInfo.defaultLocale,
        labelFields: labelFields(model),
      }))
    },

    async entries(uid: string, page: number, query: string) {
      if (isBlockedUid(uid)) {
        throw new ImportExportError("That content type cannot be exported.", "BLOCKED_CONTENT_TYPE", { uid })
      }
      const source = schemaSourceFromStrapi(strapi)
      const model = source.getModel(uid)
      if (!model) {
        throw new ImportExportError(`Content type ${uid} does not exist.`, "MISSING_CONTENT_TYPE", { uid })
      }
      const fields = labelFields(model)
      const filters = query
        ? { $or: fields.map((field) => ({ [field]: { $containsi: query } })) }
        : undefined
      const rows = await findPage(strapi, source, {
        uid,
        status: "draft",
        locale: null,
        page,
        pageSize: 25,
        filters,
        populate: undefined,
      })
      return rows.map((row) => {
        const label = fields.map((field) => row[field]).find((value) => typeof value === "string" && value) ?? row.documentId
        return {
          documentId: row.documentId,
          label,
          locale: row.locale ?? null,
        }
      })
    },

    async listJobs(page = 1) {
      const result = await jobs().findMany({
        sort: ["createdAt:desc"],
        pagination: { page, pageSize: 25 },
      })
      const rows = Array.isArray(result) ? result : []
      return rows.map((row) => toPublic(row as Record<string, unknown>))
    },

    async findJob(documentId: string) {
      const job = await jobs().findOne({ documentId: assertSafeId(documentId) })
      if (!job) {
        throw new ImportExportError("Job not found.", "NOT_FOUND")
      }
      return toPublic(job)
    },

    async deleteJob(documentId: string) {
      const id = assertSafeId(documentId)
      const job = await jobs().findOne({ documentId: id })
      if (!job) {
        throw new ImportExportError("Job not found.", "NOT_FOUND")
      }
      if (job.state === "queued" || job.state === "running") {
        throw new ImportExportError("A job that is still running cannot be deleted.", "JOB_RUNNING")
      }
      await removeJobFiles(strapi, job)
      await jobs().delete({ documentId: id })
      progressByJob.delete(id)
      return { deleted: 1 }
    },

    async clearHistory() {
      let deleted = 0
      for (;;) {
        const result = await jobs().findMany({
          filters: { state: { $in: ["completed", "failed"] } },
          pagination: { page: 1, pageSize: 50 },
        })
        const rows = Array.isArray(result) ? result : []
        if (rows.length === 0) {
          break
        }
        for (const row of rows) {
          const record = row as Record<string, unknown>
          await removeJobFiles(strapi, record)
          await jobs().delete({ documentId: String(record.documentId) })
          progressByJob.delete(String(record.documentId))
          deleted += 1
        }
      }
      return { deleted }
    },

    async download(documentId: string) {
      const job = await jobs().findOne({ documentId: assertSafeId(documentId) })
      if (!job?.archivePath || typeof job.archivePath !== "string") {
        throw new ImportExportError("This job has no archive to download.", "NO_ARCHIVE")
      }
      const root = path.resolve(storageRoot(strapi))
      const archive = path.resolve(job.archivePath)
      if (!archive.startsWith(root + path.sep)) {
        throw new ImportExportError("Archive path is outside the plugin storage directory.", "UNSAFE_PATH")
      }
      await stat(archive)
      return {
        stream: createReadStream(archive),
        filename: path.basename(archive),
      }
    },

    startExport(selection: ExportSelection) {
      return this.enqueue("export", selection, async (documentId) => {
        const source = schemaSourceFromStrapi(strapi)
        const config = readPluginConfig(strapi)
        const directory = path.join(storageRoot(strapi), "exports", documentId)
        const version = strapi.config.get("info.strapi", "5.0.0")
        const { filePath, manifest } = await runExport(selection, directory, {
          source,
          strapiVersion: String(version),
          environment: String(strapi.config.get("environment", "development")),
          maxDepth: config.maxRecursionDepth,
          batchSize: config.batchSize,
          listLocales: () => listLocales(strapi),
          findPage: (input) => findPage(strapi, source, input),
          readMedia: (file) => readUploadBytes(strapi, file),
          onProgress: (stage, done, total) => updateProgress(documentId, stage, done, total),
        })
        return {
          summary: manifest,
          archivePath: filePath,
          warnings: [],
          errors: [],
        }
      })
    },

    async validateUpload(filepath: string, originalName: string, size: number) {
      const config = readPluginConfig(strapi)
      if (!originalName.toLowerCase().endsWith(".zip")) {
        throw new ImportExportError("Only .zip export packages can be imported.", "INVALID_FILE_TYPE")
      }
      if (size > config.maxArchiveBytes) {
        throw new ImportExportError(`The archive exceeds the ${config.maxArchiveBytes} byte limit.`, "ARCHIVE_TOO_LARGE")
      }
      const header = await readHeader(filepath)
      if (header.toString("utf8", 0, 2) !== "PK") {
        throw new ImportExportError("Uploaded file is not a ZIP archive.", "INVALID_ARCHIVE")
      }
      const token = randomUUID()
      const pending = path.join(storageRoot(strapi), "pending")
      await mkdir(pending, { recursive: true })
      const stored = path.join(pending, `${token}.zip`)
      await copyFile(filepath, stored)
      const work = path.join(pending, token)
      const opened = await openPackage(stored, work, config.maxArchiveBytes)
      const source = schemaSourceFromStrapi(strapi)
      const ports = createWritePorts(strapi)
      const options = defaultImportOptions(strapi)
      options.dryRun = true
      const result = await runImport(opened, options, {
        source,
        ports,
        publishing: options.publishMode !== "draft",
        findMediaCandidates: (media) => findMediaCandidates(strapi, media),
        rememberMedia: (sha, media) => rememberMedia(strapi, sha, media),
        uploadMedia: (media, bytes) => uploadMediaFile(strapi, media, bytes),
        deleteMedia: (id) => deleteMedia(strapi, id),
      })
      await removeWorkDir(work)
      return { token, preview: result.preview }
    },

    startImport(token: string, options: ImportOptions) {
      if (!/^[0-9a-f-]{36}$/.test(token)) {
        throw new ImportExportError("The upload token is not valid.", "INVALID_TOKEN")
      }
      const zipPath = path.join(storageRoot(strapi), "pending", `${token}.zip`)
      return this.enqueue("import", { ...options, token: "redacted" }, async (documentId) => {
        const config = readPluginConfig(strapi)
        const work = path.join(storageRoot(strapi), "imports", documentId)
        const opened = await openPackage(zipPath, work, config.maxArchiveBytes)
        const result = await runImport(
          opened,
          { ...options, dryRun: false },
          {
            source: schemaSourceFromStrapi(strapi),
            ports: createWritePorts(strapi),
            publishing: options.publishMode !== "draft",
            findMediaCandidates: (media) => findMediaCandidates(strapi, media),
            rememberMedia: (sha, media) => rememberMedia(strapi, sha, media),
            uploadMedia: (media, bytes) => uploadMediaFile(strapi, media, bytes),
            deleteMedia: (id) => deleteMedia(strapi, id),
          },
          (stage, done, total) => updateProgress(documentId, stage, done, total)
        )
        await removeWorkDir(work)
        if (result.preview.blocked || result.execution?.rollback.attempted) {
          const error = result.execution?.issues.find((item) => item.level === "error")
          throw new ImportExportError(error?.message ?? "Import did not complete.", "IMPORT_FAILED", {
            preview: result.preview,
            execution: result.execution,
          })
        }
        return {
          summary: {
            ...result.execution,
            stats: result.preview.stats,
          },
          warnings: result.preview.issues.filter((item) => item.level === "warning"),
          errors: [],
          rollback: result.execution?.rollback,
        }
      })
    },

    async enqueue(
      operation: "export" | "import",
      options: unknown,
      task: (documentId: string) => Promise<{ summary: unknown; archivePath?: string; warnings: StructuredIssue[]; errors: StructuredIssue[]; rollback?: unknown }>
    ) {
      const created = await jobs().create({
        data: {
          operation,
          state: "queued",
          options,
          progress: emptyProgress(),
          errors: [],
          warnings: [],
        },
      })
      const documentId = String(created.documentId)
      progressByJob.set(documentId, emptyProgress())
      setImmediate(() => {
        this.runTask(documentId, task).catch((error) => {
          strapi.log.error(error instanceof Error ? error.message : "Import/export job failed")
        })
      })
      return toPublic({ ...created, documentId, operation, state: "queued" })
    },

    async runTask(
      documentId: string,
      task: (documentId: string) => Promise<{ summary: unknown; archivePath?: string; warnings: StructuredIssue[]; errors: StructuredIssue[]; rollback?: unknown }>
    ) {
      const startedAt = new Date().toISOString()
      await jobs().update({ documentId, data: { state: "running", startedAt } })
      try {
        const result = await task(documentId)
        await jobs().update({
          documentId,
          data: {
            state: "completed",
            finishedAt: new Date().toISOString(),
            summary: result.summary,
            warnings: result.warnings,
            errors: result.errors,
            rollback: result.rollback ?? null,
            archivePath: result.archivePath ?? null,
          },
        })
      } catch (error) {
        const details = error instanceof ImportExportError ? error.details : {}
        const execution = (details.execution ?? null) as { rollback?: unknown; created?: number; updated?: number; failed?: number } | null
        await jobs().update({
          documentId,
          data: {
            state: "failed",
            finishedAt: new Date().toISOString(),
            errors: [
              {
                message: error instanceof Error ? error.message : "Import/export failed.",
                code: error instanceof ImportExportError ? error.code : "FAILED",
              },
            ],
            summary: execution,
            rollback: execution?.rollback ?? { attempted: false, completed: false, failures: [] },
          },
        })
      }
    },
  }
}

const readHeader = async (filePath: string): Promise<Buffer> => {
  const handle = await open(filePath, "r")
  try {
    const buffer = Buffer.alloc(4)
    await handle.read(buffer, 0, 4, 0)
    return buffer
  } finally {
    await handle.close()
  }
}

const defaultImportOptions = (strapi: AppStrapi): ImportOptions => {
  const config = readPluginConfig(strapi)
  return {
    conflictStrategy: config.defaultConflictStrategy,
    publishMode: "preserve",
    unresolvedRelations: config.unresolvedRelations,
    dryRun: true,
  }
}

export const parseImportOptions = (value: unknown, fallback: ImportOptions): ImportOptions => {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const strategy = String(source.conflictStrategy ?? fallback.conflictStrategy) as ConflictStrategy
  const publishMode = String(source.publishMode ?? fallback.publishMode) as PublishMode
  const unresolved = String(source.unresolvedRelations ?? fallback.unresolvedRelations) as UnresolvedRelationPolicy
  if (!["skip", "update", "create", "ask"].includes(strategy)) {
    throw new ImportExportError("Conflict strategy is invalid.", "INVALID_OPTIONS")
  }
  if (!["draft", "publish", "preserve"].includes(publishMode)) {
    throw new ImportExportError("Publish mode is invalid.", "INVALID_OPTIONS")
  }
  if (!["error", "warn"].includes(unresolved)) {
    throw new ImportExportError("Unresolved relation policy is invalid.", "INVALID_OPTIONS")
  }
  return {
    conflictStrategy: strategy,
    publishMode,
    unresolvedRelations: unresolved,
    locales: Array.isArray(source.locales) ? source.locales.map(String) : undefined,
    localeMap: source.localeMap && typeof source.localeMap === "object" ? (source.localeMap as Record<string, string>) : undefined,
    decisions: source.decisions && typeof source.decisions === "object" ? (source.decisions as ImportOptions["decisions"]) : undefined,
    dryRun: false,
  }
}

export const parseExportSelection = (value: unknown): ExportSelection => {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const contentTypes = Array.isArray(source.contentTypes) ? source.contentTypes.map(String) : []
  if (contentTypes.some((uid) => isBlockedUid(uid) || !uid.includes("::"))) {
    throw new ImportExportError("One or more content types cannot be exported.", "BLOCKED_CONTENT_TYPE")
  }
  const documentIds = Array.isArray(source.documentIds) ? source.documentIds.map(String).slice(0, 500) : undefined
  if (documentIds?.some((id) => !/^[A-Za-z0-9_-]+$/.test(id))) {
    throw new ImportExportError("Document ids contain unsupported characters.", "INVALID_ID")
  }
  let filters: Record<string, unknown> | undefined
  if (source.filters && typeof source.filters === "object") {
    filters = JSON.parse(JSON.stringify(source.filters)) as Record<string, unknown>
  }
  const status = String(source.status ?? "both")
  if (!["draft", "published", "both"].includes(status)) {
    throw new ImportExportError("Export status must be draft, published, or both.", "INVALID_OPTIONS")
  }
  return {
    contentTypes,
    documentIds,
    filters,
    includeMedia: source.includeMedia !== false,
    includeRelations: source.includeRelations !== false,
    locales: Array.isArray(source.locales) ? source.locales.map(String) : undefined,
    status: status as ExportSelection["status"],
    archiveName: typeof source.archiveName === "string" ? source.archiveName.trim().slice(0, 80) : undefined,
  }
}
