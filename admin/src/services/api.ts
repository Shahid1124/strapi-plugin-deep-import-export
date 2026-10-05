import { PLUGIN_ID } from "../pluginId"

interface FetchClient {
  get: (url: string, options?: { params?: Record<string, unknown> }) => Promise<{ data: { data: unknown } }>
  post: (url: string, body?: unknown) => Promise<{ data: { data: unknown } }>
}

const base = `/${PLUGIN_ID}`

export const api = (client: FetchClient) => ({
  contentTypes: async () => (await client.get(`${base}/content-types`)).data.data as ContentTypeOption[],
  entries: async (uid: string, q: string) =>
    (await client.get(`${base}/entries`, { params: { uid, q, page: 1 } })).data.data as EntryOption[],
  startExport: async (body: ExportRequest) => (await client.post(`${base}/export`, body)).data.data as Job,
  validate: async (file: File) => {
    const body = new FormData()
    body.append("file", file)
    return (await client.post(`${base}/import/validate`, body)).data.data as { token: string; preview: Preview }
  },
  startImport: async (token: string, options: ImportRequest) =>
    (await client.post(`${base}/import`, { token, options })).data.data as Job,
  history: async () => (await client.get(`${base}/history`)).data.data as Job[],
  status: async (id: string) => (await client.get(`${base}/status/${id}`)).data.data as Job,
})

export interface ContentTypeOption {
  uid: string
  displayName: string
  kind: "collectionType" | "singleType"
  draftAndPublish: boolean
  localized: boolean
  locales?: string[]
  defaultLocale?: string | null
}

export interface EntryOption {
  documentId: string
  label: string
  locale: string | null
}

export interface ExportRequest {
  contentTypes: string[]
  documentIds?: string[]
  includeMedia: boolean
  includeRelations: boolean
  status: "draft" | "published" | "both"
  filters?: Record<string, unknown>
  archiveName?: string
  locales?: string[]
}

export interface ImportRequest {
  conflictStrategy: "skip" | "update" | "create" | "ask"
  publishMode: "draft" | "publish" | "preserve"
  unresolvedRelations: "error" | "warn"
  decisions?: Record<string, "skip" | "update" | "create">
}

export interface ProgressBucket {
  done: number
  total: number
}

export interface Job {
  documentId: string
  operation: string
  state: string
  startedAt?: string | null
  finishedAt?: string | null
  summary?: Record<string, unknown> | null
  progress?: Record<string, ProgressBucket> | null
  errors?: Array<{ message: string; code?: string }> | null
  warnings?: Array<{ message: string }> | null
  rollback?: { attempted?: boolean; completed?: boolean; failures?: string[] } | null
  downloadable?: boolean
  filename?: string | null
}

export interface Preview {
  blocked: boolean
  stats: {
    contentTypes: number
    entries: number
    components: number
    dynamicZones: number
    relations: number
    media: number
  }
  conflicts: Array<{
    uid: string
    documentId: string
    label: string
    action: "skip" | "update" | "create"
    error?: string
    match?: { via: string; documentId: string }
  }>
  issues: Array<{ level: "error" | "warning"; message: string; code: string }>
}

export const downloadArchive = async (jobId: string, filename: string) => {
  const raw = localStorage.getItem("jwtToken")
  const token = raw ? (JSON.parse(raw) as string) : ""
  const backend = (window as Window & { strapi?: { backendURL?: string } }).strapi?.backendURL ?? ""
  const response = await fetch(`${backend}/${PLUGIN_ID}/jobs/${jobId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error("The archive is not ready to download.")
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
