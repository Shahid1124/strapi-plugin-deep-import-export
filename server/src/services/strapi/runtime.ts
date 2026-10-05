import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { PLUGIN_ID, DEFAULT_CONFIG } from "../utils/constants"
import type { ExportedDocument, MediaRef } from "../serializer/types"
import type { StoredMedia } from "../media/match"
import { schemaSourceFromStrapi, type StrapiSchemaHost } from "../schema/strapi-source"
import { hasDraftAndPublish, isLocalized } from "../schema/attributes"
import { buildPopulate } from "../schema/populate"
import { createSerializeContext, serializeAttributes } from "../serializer/serialize"
import { identityFields } from "../schema/attributes"
import type { WritePorts } from "../importer/execute"
import type { IdentityMatch } from "../resolver/identity"

export interface AppStrapi extends StrapiSchemaHost {
  log: { info(message: string): void; warn(message: string): void; error(message: string): void }
  documents(uid: string): {
    findMany(params: Record<string, unknown>): Promise<unknown>
    findFirst(params: Record<string, unknown>): Promise<Record<string, unknown> | null>
    findOne(params: Record<string, unknown>): Promise<Record<string, unknown> | null>
    create(params: Record<string, unknown>): Promise<Record<string, unknown>>
    update(params: Record<string, unknown>): Promise<unknown>
    publish(params: Record<string, unknown>): Promise<unknown>
    unpublish(params: Record<string, unknown>): Promise<unknown>
    delete(params: Record<string, unknown>): Promise<unknown>
    count(params: Record<string, unknown>): Promise<number>
  }
  db: {
    query(uid: string): {
      findMany(params: Record<string, unknown>): Promise<Array<Record<string, unknown>>>
      findOne(params: Record<string, unknown>): Promise<Record<string, unknown> | null>
    }
  }
  plugin(name: string): {
    service(name: string): Record<string, unknown>
    config?: ((key?: string) => unknown) | Record<string, unknown>
  }
  config: { get(key: string, fallback?: unknown): unknown }
  dirs: { static: { public: string } }
}

export interface PluginConfig {
  maxArchiveBytes: number
  maxRecursionDepth: number
  batchSize: number
  concurrency: number
  defaultConflictStrategy: "skip" | "update" | "create" | "ask"
  unresolvedRelations: "error" | "warn"
  storageDir: string
}

const readPluginValue = (strapi: AppStrapi, key: string, fallback: unknown): unknown => {
  const plugin = strapi.plugin(PLUGIN_ID)
  if (!plugin) {
    return fallback
  }
  if (typeof plugin.config === "function") {
    const value = plugin.config(key)
    return value === undefined ? fallback : value
  }
  if (plugin.config && typeof plugin.config === "object" && key in plugin.config) {
    return plugin.config[key]
  }
  return fallback
}

export const readPluginConfig = (strapi: AppStrapi): PluginConfig => ({
  maxArchiveBytes: Number(readPluginValue(strapi, "maxArchiveBytes", DEFAULT_CONFIG.maxArchiveBytes)),
  maxRecursionDepth: Number(readPluginValue(strapi, "maxRecursionDepth", DEFAULT_CONFIG.maxRecursionDepth)),
  batchSize: Number(readPluginValue(strapi, "batchSize", DEFAULT_CONFIG.batchSize)),
  concurrency: Number(readPluginValue(strapi, "concurrency", DEFAULT_CONFIG.concurrency)),
  defaultConflictStrategy: readPluginValue(strapi, "defaultConflictStrategy", DEFAULT_CONFIG.defaultConflictStrategy) as PluginConfig["defaultConflictStrategy"],
  unresolvedRelations: readPluginValue(strapi, "unresolvedRelations", DEFAULT_CONFIG.unresolvedRelations) as PluginConfig["unresolvedRelations"],
  storageDir: String(readPluginValue(strapi, "storageDir", "") || ""),
})

export const storageRoot = (strapi: AppStrapi): string => {
  const configured = readPluginConfig(strapi).storageDir
  return configured || path.join(process.cwd(), ".tmp", "deep-import-export")
}

const rowsOf = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) {
    return value as Array<Record<string, unknown>>
  }
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: Array<Record<string, unknown>> }).results
  }
  return []
}

export const listLocales = async (strapi: AppStrapi): Promise<{ codes: string[]; defaultLocale: string | null }> => {
  const locales = strapi.plugin("i18n")?.service("locales") as
    | { find?: () => Promise<Array<{ code: string }>>; getDefaultLocale?: () => Promise<string> }
    | undefined
  if (!locales?.find) {
    return { codes: [], defaultLocale: null }
  }
  const found = await locales.find()
  const codes = found.map((locale) => locale.code).filter(Boolean)
  const defaultLocale = locales.getDefaultLocale ? await locales.getDefaultLocale() : codes[0] ?? null
  return { codes, defaultLocale }
}

export const findPage = async (
  strapi: AppStrapi,
  source: ReturnType<typeof schemaSourceFromStrapi>,
  input: {
    uid: string
    status: "draft" | "published"
    locale: string | null
    page: number
    pageSize: number
    populate?: Record<string, unknown>
    filters?: Record<string, unknown>
  }
): Promise<Array<Record<string, unknown>>> => {
  const model = source.getModel(input.uid)
  const params: Record<string, unknown> = {
    pagination: { page: input.page, pageSize: input.pageSize },
    filters: input.filters,
    populate: input.populate ?? buildPopulate(input.uid, source, readPluginConfig(strapi).maxRecursionDepth),
  }
  if (model && hasDraftAndPublish(model)) {
    params.status = input.status
  }
  if (input.locale && model && isLocalized(model)) {
    params.locale = input.locale
  }
  const result = await strapi.documents(input.uid).findMany(params)
  return rowsOf(result)
}

const matchFromRow = (row: Record<string, unknown> | null, via: IdentityMatch["via"], field?: string): IdentityMatch | null => {
  if (!row?.documentId) {
    return null
  }
  return { documentId: String(row.documentId), via, field }
}

export const createWritePorts = (strapi: AppStrapi): WritePorts => {
  const source = schemaSourceFromStrapi(strapi)
  const localeParams = (uid: string, locale: string | null): Record<string, unknown> => {
    const model = source.getModel(uid)
    if (locale && model && isLocalized(model)) {
      return { locale }
    }
    return {}
  }
  return {
    async findByDocumentId(uid, documentId, locale) {
      const row = await strapi.documents(uid).findOne({ documentId, ...localeParams(uid, locale) })
      return matchFromRow(row, "documentId")
    },
    async findByField(uid, field, value, locale) {
      const row = await strapi.documents(uid).findFirst({
        filters: { [field]: { $eq: value } },
        ...localeParams(uid, locale),
      })
      return matchFromRow(row, field === "slug" ? "slug" : "unique", field)
    },
    async findSingle(uid, locale) {
      const row = await strapi.documents(uid).findFirst({ ...localeParams(uid, locale) })
      return matchFromRow(row, "singleType")
    },
    async create(input) {
      const data = input.documentId ? { ...input.data, documentId: input.documentId } : input.data
      const created = await strapi.documents(input.uid).create({
        data,
        status: input.status ?? "draft",
        ...localeParams(input.uid, input.locale),
      })
      return { documentId: String(created.documentId) }
    },
    async update(input) {
      await strapi.documents(input.uid).update({
        documentId: input.documentId,
        data: input.data,
        status: input.status ?? "draft",
        ...localeParams(input.uid, input.locale),
      })
    },
    async publish(input) {
      const model = source.getModel(input.uid)
      if (!model || !hasDraftAndPublish(model)) {
        return
      }
      await strapi.documents(input.uid).publish({
        documentId: input.documentId,
        ...localeParams(input.uid, input.locale),
      })
    },
    async unpublish(input) {
      const model = source.getModel(input.uid)
      if (!model || !hasDraftAndPublish(model)) {
        return
      }
      try {
        await strapi.documents(input.uid).unpublish({
          documentId: input.documentId,
          ...localeParams(input.uid, input.locale),
        })
      } catch (error) {
        strapi.log.warn(`Unpublish skipped for ${input.uid} ${input.documentId}: ${error instanceof Error ? error.message : "not published"}`)
      }
    },
    async delete(input) {
      await strapi.documents(input.uid).delete({ documentId: input.documentId })
    },
    async readSnapshot(uid, documentId) {
      return readExportedDocument(strapi, source, uid, documentId)
    },
    async findMediaId(media) {
      const candidates = await findMediaCandidates(strapi, media)
      const { matchMedia } = await import("../media/match")
      return matchMedia(media, candidates)?.id ?? null
    },
  }
}

export const readExportedDocument = async (
  strapi: AppStrapi,
  source: ReturnType<typeof schemaSourceFromStrapi>,
  uid: string,
  documentId: string
): Promise<ExportedDocument | null> => {
  const model = source.getModel(uid)
  if (!model) {
    return null
  }
  const locales = isLocalized(model) ? (await listLocales(strapi)).codes : [null]
  const populate = buildPopulate(uid, source, readPluginConfig(strapi).maxRecursionDepth)
  const document: ExportedDocument = {
    uid,
    kind: model.kind === "singleType" ? "singleType" : "collectionType",
    documentId,
    identity: {},
    locales: [],
  }
  for (const locale of locales.length ? locales : [null]) {
    const params: Record<string, unknown> = { documentId, populate }
    if (locale && isLocalized(model)) {
      params.locale = locale
    }
    const draft = hasDraftAndPublish(model) ? await strapi.documents(uid).findOne({ ...params, status: "draft" }) : await strapi.documents(uid).findOne(params)
    const published = hasDraftAndPublish(model) ? await strapi.documents(uid).findOne({ ...params, status: "published" }) : null
    if (!draft && !published) {
      continue
    }
    const contextFor = () => {
      const context = createSerializeContext(source, { includeRelations: true, maxDepth: readPluginConfig(strapi).maxRecursionDepth })
      return context
    }
    const draftData = draft ? serializeAttributes(draft, model, contextFor()) : null
    const publishedData = published ? serializeAttributes(published, model, contextFor()) : null
    document.locales.push({
      locale,
      publicationState: publishedData && draftData ? "modified" : publishedData ? "published" : "draft",
      draft: draftData ? { data: draftData } : null,
      published: publishedData ? { data: publishedData } : null,
    })
    const identitySource = publishedData ?? draftData ?? {}
    for (const field of identityFields(model)) {
      const value = identitySource[field]
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        document.identity[field] = value
      }
    }
  }
  return document.locales.length ? document : null
}

export const findMediaCandidates = async (strapi: AppStrapi, media: MediaRef): Promise<StoredMedia[]> => {
  const fingerprints = media.sha256
    ? rowsOf(
        await strapi.documents(`plugin::${PLUGIN_ID}.media-fingerprint`).findMany({
          filters: { sha256: { $eq: media.sha256 } },
        })
      )
    : []
  const remembered: StoredMedia[] = []
  for (const fingerprint of fingerprints) {
    const file = await strapi.db.query("plugin::upload.file").findOne({ where: { id: fingerprint.fileId } })
    if (file) {
      remembered.push(toStoredMedia(file, String(fingerprint.sha256 ?? "")))
    }
  }
  const where = media.hash
    ? { $or: [{ hash: media.hash }, { name: media.name, mime: media.mime }] }
    : { name: media.name, mime: media.mime }
  const files = await strapi.db.query("plugin::upload.file").findMany({ where, limit: 20 })
  return [...remembered, ...files.map((file) => toStoredMedia(file))]
}

const toStoredMedia = (file: Record<string, unknown>, sha256?: string): StoredMedia => ({
  id: Number(file.id),
  documentId: typeof file.documentId === "string" ? file.documentId : null,
  hash: typeof file.hash === "string" ? file.hash : null,
  name: typeof file.name === "string" ? file.name : null,
  mime: typeof file.mime === "string" ? file.mime : null,
  size: typeof file.size === "number" ? file.size : null,
  sizeInBytes: typeof file.sizeInBytes === "number" ? file.sizeInBytes : null,
  sha256: sha256 ?? null,
})

export const uploadMediaFile = async (strapi: AppStrapi, media: MediaRef, bytes: Buffer): Promise<StoredMedia> => {
  const upload = strapi.plugin("upload").service("upload") as {
    upload: (input: { data: { fileInfo: Record<string, unknown> }; files: Record<string, unknown> }) => Promise<Array<Record<string, unknown>>>
  }
  const safeName = path.basename(media.name).replace(/[^a-zA-Z0-9._-]/g, "_") || "file"
  const directory = path.join(storageRoot(strapi), "uploads")
  await mkdir(directory, { recursive: true })
  const filepath = path.join(directory, `${createHash("sha256").update(bytes).digest("hex").slice(0, 12)}-${safeName}`)
  await writeFile(filepath, bytes)
  try {
    const uploaded = await upload.upload({
      data: {
        fileInfo: {
          name: media.name,
          alternativeText: media.alternativeText ?? undefined,
          caption: media.caption ?? undefined,
        },
      },
      files: {
        filepath,
        originalFilename: safeName,
        mimetype: media.mime || "application/octet-stream",
        size: bytes.length,
      },
    })
    return toStoredMedia(uploaded[0])
  } finally {
    await rmQuiet(filepath)
  }
}

export const rememberMedia = async (strapi: AppStrapi, sha256: string, media: StoredMedia): Promise<void> => {
  const existing = await strapi.documents(`plugin::${PLUGIN_ID}.media-fingerprint`).findFirst({
    filters: { sha256: { $eq: sha256 } },
  })
  if (existing) {
    return
  }
  await strapi.documents(`plugin::${PLUGIN_ID}.media-fingerprint`).create({
    data: {
      sha256,
      fileId: media.id,
      name: media.name,
      mime: media.mime,
      size: media.sizeInBytes ?? null,
    },
  })
}

export const deleteMedia = async (strapi: AppStrapi, id: number): Promise<void> => {
  const upload = strapi.plugin("upload").service("upload") as { remove?: (file: Record<string, unknown>) => Promise<unknown> }
  const file = await strapi.db.query("plugin::upload.file").findOne({ where: { id } })
  if (file && upload.remove) {
    await upload.remove(file)
  }
}

export const readUploadBytes = async (strapi: AppStrapi, file: Record<string, unknown>): Promise<Buffer> => {
  const url = typeof file.url === "string" ? file.url : ""
  if (url.startsWith("/")) {
    const local = path.join(strapi.dirs.static.public, url)
    try {
      return await readFile(local)
    } catch {
      const serverUrl = String(strapi.config.get("server.url", ""))
      if (serverUrl) {
        const response = await fetch(new URL(url, serverUrl))
        if (!response.ok) {
          throw new Error(`Could not download media ${url}`)
        }
        return Buffer.from(await response.arrayBuffer())
      }
    }
  }
  if (/^https?:\/\//i.test(url)) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Could not download media ${file.name ?? url}`)
    }
    return Buffer.from(await response.arrayBuffer())
  }
  throw new Error(`Media ${String(file.name ?? file.id)} has no readable URL.`)
}

const rmQuiet = async (filePath: string): Promise<void> => {
  const { rm } = await import("node:fs/promises")
  await rm(filePath, { force: true })
}
