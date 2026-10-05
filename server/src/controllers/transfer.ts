import { PLUGIN_ID } from "../services/utils/constants"
import { ImportExportError } from "../services/utils/errors"
import { parseExportSelection, parseImportOptions, type PublicJob } from "../services/transfer"
import { readPluginConfig, type AppStrapi } from "../services/strapi/runtime"

interface Context {
  request: { body?: unknown; files?: Record<string, UploadedFile | UploadedFile[]> }
  params: { id?: string }
  body: unknown
  badRequest: (message: string, details?: unknown) => void
  notFound: (message: string) => void
  set: (key: string, value: string) => void
  status: number
}

interface UploadedFile {
  filepath?: string
  path?: string
  size?: number
  originalFilename?: string
  name?: string
  mimetype?: string
  type?: string
}

const serviceOf = (strapi: AppStrapi) => {
  return strapi.plugin(PLUGIN_ID).service("transfer") as {
    contentTypes: () => Promise<unknown>
    entries: (uid: string, page: number, query: string) => Promise<unknown>
    listJobs: (page?: number) => Promise<PublicJob[]>
    findJob: (id: string) => Promise<PublicJob>
    download: (id: string) => Promise<{ stream: NodeJS.ReadableStream; filename: string }>
    startExport: (selection: unknown) => Promise<PublicJob>
    validateUpload: (filepath: string, name: string, size: number) => Promise<unknown>
    startImport: (token: string, options: unknown) => Promise<PublicJob>
  }
}

const fail = (ctx: Context, error: unknown) => {
  if (error instanceof ImportExportError) {
    const status = error.code === "NOT_FOUND" || error.code === "NO_ARCHIVE" ? "notFound" : "badRequest"
    if (status === "notFound") {
      ctx.notFound(error.message)
      return
    }
    ctx.badRequest(error.message, { code: error.code, ...error.details })
    return
  }
  ctx.badRequest(error instanceof Error ? error.message : "Import/export request failed.")
}

const uploadedFile = (ctx: Context): { filepath: string; name: string; size: number; mime: string } => {
  const files = ctx.request.files ?? {}
  const candidate = files.file ?? files.files
  const file = Array.isArray(candidate) ? candidate[0] : candidate
  if (!file) {
    throw new ImportExportError("Choose a .zip export package to upload.", "MISSING_FILE")
  }
  const filepath = file.filepath || file.path
  if (!filepath) {
    throw new ImportExportError("The uploaded file could not be read.", "MISSING_FILE")
  }
  return {
    filepath,
    name: file.originalFilename || file.name || "package.zip",
    size: Number(file.size ?? 0),
    mime: file.mimetype || file.type || "",
  }
}

const allowedMime = (mime: string, name: string): boolean => {
  if (!name.toLowerCase().endsWith(".zip")) {
    return false
  }
  return mime === "" || mime === "application/zip" || mime === "application/x-zip-compressed" || mime === "application/octet-stream"
}

export default ({ strapi }: { strapi: AppStrapi }) => ({
  async contentTypes(ctx: Context) {
    try {
      ctx.body = { data: await serviceOf(strapi).contentTypes() }
    } catch (error) {
      fail(ctx, error)
    }
  },
  async entries(ctx: Context & { query?: Record<string, string> }) {
    try {
      const urlQuery = ctx.query ?? {}
      ctx.body = {
        data: await serviceOf(strapi).entries(String(urlQuery.uid ?? ""), Number(urlQuery.page ?? 1), String(urlQuery.q ?? "")),
      }
    } catch (error) {
      fail(ctx, error)
    }
  },
  async exportStart(ctx: Context) {
    try {
      ctx.body = { data: await serviceOf(strapi).startExport(parseExportSelection(ctx.request.body)) }
    } catch (error) {
      fail(ctx, error)
    }
  },
  async validate(ctx: Context) {
    try {
      const file = uploadedFile(ctx)
      if (!allowedMime(file.mime, file.name)) {
        throw new ImportExportError("Only ZIP archives created by this plugin are accepted.", "INVALID_FILE_TYPE")
      }
      ctx.body = { data: await serviceOf(strapi).validateUpload(file.filepath, file.name, file.size) }
    } catch (error) {
      fail(ctx, error)
    }
  },
  async importStart(ctx: Context) {
    try {
      const body = (ctx.request.body ?? {}) as { token?: string; options?: unknown }
      if (!body.token) {
        throw new ImportExportError("Validate a package before importing it.", "MISSING_TOKEN")
      }
      const config = readPluginConfig(strapi)
      const fallback = {
        conflictStrategy: config.defaultConflictStrategy,
        publishMode: "preserve" as const,
        unresolvedRelations: config.unresolvedRelations,
      }
      ctx.body = { data: await serviceOf(strapi).startImport(body.token, parseImportOptions(body.options, fallback)) }
    } catch (error) {
      fail(ctx, error)
    }
  },
  async history(ctx: Context) {
    try {
      const urlQuery = (ctx as Context & { query?: Record<string, string> }).query ?? {}
      ctx.body = { data: await serviceOf(strapi).listJobs(Number(urlQuery.page ?? 1)) }
    } catch (error) {
      fail(ctx, error)
    }
  },
  async status(ctx: Context) {
    try {
      ctx.body = { data: await serviceOf(strapi).findJob(String(ctx.params.id)) }
    } catch (error) {
      fail(ctx, error)
    }
  },
  async download(ctx: Context) {
    try {
      const file = await serviceOf(strapi).download(String(ctx.params.id))
      ctx.set("Content-Type", "application/zip")
      ctx.set("Content-Disposition", `attachment; filename="${file.filename.replace(/"/g, "")}"`)
      ctx.body = file.stream
    } catch (error) {
      fail(ctx, error)
    }
  },
})
