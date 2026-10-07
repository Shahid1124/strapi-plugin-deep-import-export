import { decisionKey, type ConflictStrategy, type ExportedDocument } from "../serializer/types"

export interface IdentityMatch {
  documentId: string
  via: "mapping" | "documentId" | "unique" | "slug" | "singleType"
  field?: string
}

export interface IdentityPorts {
  findByDocumentId: (uid: string, documentId: string, locale: string | null) => Promise<IdentityMatch | null>
  findByField: (uid: string, field: string, value: string | number | boolean, locale: string | null) => Promise<IdentityMatch | null>
  findSingle: (uid: string, locale: string | null) => Promise<IdentityMatch | null>
}

export interface MatchOptions {
  idMap?: Record<string, string>
  locale: string | null
}

const uniqueEntries = (identity: ExportedDocument["identity"]): Array<[string, string | number | boolean]> => {
  return Object.entries(identity).filter((entry): entry is [string, string | number | boolean] => {
    const value = entry[1]
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  })
}

/**
 * Matching priority: explicit mapping, documentId, configured unique fields, slug.
 * Single types always match the existing singleton when one exists.
 */
export const matchDocument = async (
  document: ExportedDocument,
  ports: IdentityPorts,
  options: MatchOptions
): Promise<IdentityMatch | null> => {
  const mapped = options.idMap?.[decisionKey(document.uid, document.documentId)]
  if (mapped) {
    return { documentId: mapped, via: "mapping" }
  }

  if (document.kind === "singleType") {
    const single = await ports.findSingle(document.uid, options.locale)
    if (single) {
      return { ...single, via: "singleType" }
    }
  }

  const byId = await ports.findByDocumentId(document.uid, document.documentId, options.locale)
  if (byId) {
    return { ...byId, via: "documentId" }
  }

  const fields = uniqueEntries(document.identity)
  const slug = fields.find(([field]) => field === "slug")
  const ordered = [...fields.filter(([field]) => field !== "slug"), ...(slug ? [slug] : [])]
  for (const [field, value] of ordered) {
    const found = await ports.findByField(document.uid, field, value, options.locale)
    if (found) {
      return { ...found, via: field === "slug" ? "slug" : "unique", field }
    }
  }
  return null
}

export const strategyFor = (
  strategy: ConflictStrategy,
  hasMatch: boolean,
  decision: Exclude<ConflictStrategy, "ask"> | undefined,
  kind: ExportedDocument["kind"]
): { action: "skip" | "update" | "create"; error?: string } => {
  if (kind === "singleType") {
    if (!hasMatch) {
      return { action: "create" }
    }
    if (strategy === "skip" || decision === "skip") {
      return { action: "skip" }
    }
    return { action: "update" }
  }
  if (!hasMatch) {
    return { action: "create" }
  }
  const chosen = strategy === "ask" ? decision : strategy
  if (!chosen) {
    return { action: "skip", error: "Choose skip, update, or create for this existing document before importing." }
  }
  return { action: chosen }
}
