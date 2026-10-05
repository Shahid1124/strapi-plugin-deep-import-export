import { hasDraftAndPublish, isLocalized } from "../schema/attributes"
import type { SchemaSource } from "../schema/types"
import { collectMediaRefs } from "../serializer/serialize"
import {
  decisionKey,
  type ExportedDocument,
  type ImportOptions,
  type MediaRef,
  type RelationRef,
} from "../serializer/types"
import { issue, type StructuredIssue } from "../utils/errors"
import { matchDocument, strategyFor, type IdentityMatch, type IdentityPorts } from "../resolver/identity"
import { deserializeAttributes, type DeserializeContext } from "./deserialize"
import { planPublication } from "./publication"

export interface ConflictPreview {
  uid: string
  documentId: string
  label: string
  match?: IdentityMatch
  action: "skip" | "update" | "create"
  error?: string
}

export interface PreparedImport {
  issues: StructuredIssue[]
  conflicts: ConflictPreview[]
  media: MediaRef[]
  blocked: boolean
}

const primaryLocale = (document: ExportedDocument): string | null => document.locales[0]?.locale ?? null

const labelOf = (document: ExportedDocument): string => {
  const identity = document.identity
  for (const key of ["title", "name", "slug", "pathname"]) {
    const value = identity[key]
    if (typeof value === "string" && value) {
      return value
    }
  }
  return document.documentId
}

export const collectDocumentMedia = (documents: ExportedDocument[]): MediaRef[] => {
  const seen = new Set<string>()
  const media: MediaRef[] = []
  for (const document of documents) {
    for (const ref of collectMediaRefs(document)) {
      const id = ref.sha256 || ref.key || ref.hash || `${ref.name}:${ref.sizeInBytes ?? ref.size ?? ""}`
      if (seen.has(id)) {
        continue
      }
      seen.add(id)
      media.push(ref)
    }
  }
  return media
}

export const prepareImport = async (
  documents: ExportedDocument[],
  source: SchemaSource,
  options: ImportOptions,
  ports: IdentityPorts
): Promise<PreparedImport> => {
  const issues: StructuredIssue[] = []
  const conflicts: ConflictPreview[] = []
  for (const document of documents) {
    const model = source.getModel(document.uid)
    if (!model) {
      continue
    }
    const locale = primaryLocale(document)
    const match = await matchDocument(document, ports, { locale, idMap: undefined })
    const decision = options.decisions?.[decisionKey(document.uid, document.documentId)]
    const strategy = strategyFor(options.conflictStrategy, Boolean(match), decision, document.kind)
    if (match && options.conflictStrategy !== "create") {
      conflicts.push({
        uid: document.uid,
        documentId: document.documentId,
        label: labelOf(document),
        match,
        action: strategy.action,
        error: strategy.error,
      })
    }
    if (strategy.error) {
      issues.push(
        issue("error", "CONFLICT_DECISION", strategy.error, {
          uid: document.uid,
          documentId: document.documentId,
          label: labelOf(document),
        })
      )
    }
    if (document.kind === "singleType" && options.conflictStrategy === "create" && match) {
      issues.push(
        issue("warning", "SINGLE_TYPE_UPDATE", `${document.uid} is a single type, so "create new" updates the existing entry.`, {
          uid: document.uid,
        })
      )
    }
    if (!isLocalized(model) && document.locales.length > 1) {
      issues.push(
        issue("warning", "LOCALE_IGNORED", `Only one locale will be written for ${document.uid}.`, {
          uid: document.uid,
          documentId: document.documentId,
        })
      )
    }
  }
  return {
    issues,
    conflicts,
    media: collectDocumentMedia(documents),
    blocked: issues.some((item) => item.level === "error"),
  }
}

export interface WritePorts extends IdentityPorts {
  create: (input: WriteInput) => Promise<{ documentId: string }>
  update: (input: WriteInput) => Promise<void>
  publish: (input: { uid: string; documentId: string; locale: string | null }) => Promise<void>
  unpublish: (input: { uid: string; documentId: string; locale: string | null }) => Promise<void>
  delete: (input: { uid: string; documentId: string }) => Promise<void>
  readSnapshot: (uid: string, documentId: string) => Promise<ExportedDocument | null>
  findMediaId: (media: MediaRef) => Promise<number | null>
}

export interface WriteInput {
  uid: string
  documentId?: string
  locale: string | null
  data: Record<string, unknown>
  status?: "draft" | "published"
}

export interface RollbackRecord {
  created: Array<{ uid: string; documentId: string }>
  updated: ExportedDocument[]
  mediaIds: number[]
}

export interface ExecuteResult {
  created: number
  updated: number
  skipped: number
  failed: number
  issues: StructuredIssue[]
  rollback: {
    attempted: boolean
    completed: boolean
    failures: string[]
  }
}

const localeFilter = (document: ExportedDocument, options: ImportOptions) => {
  const selected = options.locales
  return document.locales.filter((locale) => {
    if (!selected || selected.length === 0 || selected.includes("*")) {
      return true
    }
    return locale.locale ? selected.includes(locale.locale) : true
  }).map((locale) => ({
    ...locale,
    locale: locale.locale && options.localeMap?.[locale.locale] ? options.localeMap[locale.locale] : locale.locale,
  }))
}

const relationResolver =
  (idMap: Map<string, string>, ports: IdentityPorts, issues: StructuredIssue[], policy: ImportOptions["unresolvedRelations"]) =>
  (relation: RelationRef): string | null => {
    const mapped = idMap.get(decisionKey(relation.uid, relation.documentId))
    if (mapped) {
      return mapped
    }
    return null
  }

export const executeImport = async (
  documents: ExportedDocument[],
  source: SchemaSource,
  options: ImportOptions,
  ports: WritePorts,
  mediaIds: Map<string, number>,
  onProgress?: (stage: string, done: number, total: number) => void
): Promise<ExecuteResult> => {
  const issues: StructuredIssue[] = []
  const rollback: RollbackRecord = { created: [], updated: [], mediaIds: [] }
  const idMap = new Map<string, string>()
  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  const resolveMedia = (media: { sha256?: string; key?: string; hash?: string; name: string; sizeInBytes?: number | null; size?: number | null }) => {
    const keys = [media.sha256, media.key, media.hash, `${media.name}:${media.sizeInBytes ?? media.size ?? ""}`].filter(
      (key): key is string => Boolean(key)
    )
    for (const key of keys) {
      const id = mediaIds.get(key)
      if (typeof id === "number") {
        return id
      }
    }
    return null
  }

  const contextFor = (mode: "omit" | "resolve", unresolved: StructuredIssue[]): DeserializeContext => ({
    relationMode: mode,
    path: [],
    model: (uid) => {
      const model = source.getModel(uid)
      if (!model) {
        throw new Error(`Missing component schema ${uid}`)
      }
      return model
    },
    resolveMedia,
    resolveRelation: (relation) => {
      const mapped = relationResolver(idMap, ports, unresolved, options.unresolvedRelations)(relation)
      if (mapped) {
        return mapped
      }
      return pendingLookups.get(decisionKey(relation.uid, relation.documentId)) ?? null
    },
    onUnresolvedRelation: (relation, path) => {
      const message = [
        "Unable to resolve relation.",
        `Referenced type: ${relation.uid}`,
        `documentId: ${relation.documentId}`,
        path ? `Field: ${path}` : "",
        "Reason: Referenced document does not exist in this environment or in the import package.",
      ]
        .filter(Boolean)
        .join("\n")
      unresolved.push(issue(options.unresolvedRelations === "error" ? "error" : "warning", "UNRESOLVED_RELATION", message, {
        uid: relation.uid,
        documentId: relation.documentId,
        path,
        identity: relation.identity,
      }))
    },
  })

  const pendingLookups = new Map<string, string | null>()

  try {
    const actions: Array<{ document: ExportedDocument; action: "skip" | "update" | "create"; match?: IdentityMatch }> = []
    for (const document of documents) {
      const match = await matchDocument(document, ports, { locale: primaryLocale(document) })
      const decision = options.decisions?.[decisionKey(document.uid, document.documentId)]
      const strategy = strategyFor(options.conflictStrategy, Boolean(match), decision, document.kind)
      if (strategy.error) {
        throw new Error(strategy.error)
      }
      actions.push({ document, action: strategy.action, match: match ?? undefined })
      if (strategy.action === "skip") {
        skipped += 1
        if (match) {
          idMap.set(decisionKey(document.uid, document.documentId), match.documentId)
        }
      }
    }

    onProgress?.("entries", 0, actions.length)
    for (const [index, action] of actions.entries()) {
      if (action.action === "skip") {
        onProgress?.("entries", index + 1, actions.length)
        continue
      }
      const model = source.getModel(action.document.uid)
      if (!model) {
        failed += 1
        continue
      }
      const locales = localeFilter(action.document, options).slice(0, isLocalized(model) ? undefined : 1)
      if (action.action === "update" && action.match) {
        const snapshot = await ports.readSnapshot(action.document.uid, action.match.documentId)
        if (snapshot) {
          rollback.updated.push(snapshot)
        }
      }
      let destinationId = action.match?.documentId
      if (action.action === "create") {
        const taken = await ports.findByDocumentId(action.document.uid, action.document.documentId, primaryLocale(action.document))
        destinationId = taken ? undefined : action.document.documentId
      }
      const first = locales[0]
      const publication = planPublication(first, options.publishMode, hasDraftAndPublish(model))
      const baseData = deserializeAttributes(publication.data, model, contextFor("omit", issues))
      if (action.action === "create") {
        const createdDoc = await ports.create({
          uid: action.document.uid,
          documentId: destinationId,
          locale: first.locale,
          data: destinationId ? { ...baseData, documentId: destinationId } : baseData,
          status: "draft",
        })
        destinationId = createdDoc.documentId
        rollback.created.push({ uid: action.document.uid, documentId: destinationId })
        created += 1
      } else if (destinationId) {
        await ports.update({
          uid: action.document.uid,
          documentId: destinationId,
          locale: first.locale,
          data: baseData,
          status: "draft",
        })
        updated += 1
      }
      if (!destinationId) {
        failed += 1
        continue
      }
      idMap.set(decisionKey(action.document.uid, action.document.documentId), destinationId)
      for (const locale of locales.slice(1)) {
        const extra = planPublication(locale, options.publishMode, hasDraftAndPublish(model))
        const data = deserializeAttributes(extra.data, model, contextFor("omit", issues))
        await ports.update({
          uid: action.document.uid,
          documentId: destinationId,
          locale: locale.locale,
          data,
          status: "draft",
        })
      }
      onProgress?.("entries", index + 1, actions.length)
    }

    onProgress?.("relations", 0, actions.length)
    for (const [index, action] of actions.entries()) {
      if (action.action === "skip") {
        continue
      }
      const model = source.getModel(action.document.uid)
      const destinationId = idMap.get(decisionKey(action.document.uid, action.document.documentId))
      if (!model || !destinationId) {
        continue
      }
      const locales = localeFilter(action.document, options).slice(0, isLocalized(model) ? undefined : 1)
      for (const locale of locales) {
        const version = planPublication(locale, options.publishMode, hasDraftAndPublish(model))
        const unresolved: StructuredIssue[] = []
        await resolveExternalRelations(version.data, ports, pendingLookups)
        const data = deserializeAttributes(version.data, model, contextFor("resolve", unresolved))
        const errors = unresolved.filter((item) => item.level === "error")
        if (errors.length > 0) {
          issues.push(...errors)
          throw new Error(errors[0].message)
        }
        issues.push(...unresolved)
        await ports.update({
          uid: action.document.uid,
          documentId: destinationId,
          locale: locale.locale,
          data,
          status: "draft",
        })
        if (version.publish) {
          await ports.publish({ uid: action.document.uid, documentId: destinationId, locale: locale.locale })
        } else if (version.unpublish && hasDraftAndPublish(model)) {
          await ports.unpublish({ uid: action.document.uid, documentId: destinationId, locale: locale.locale })
        }
        if (version.draftAfterPublish) {
          const draftData = deserializeAttributes(version.draftAfterPublish, model, contextFor("resolve", issues))
          await ports.update({
            uid: action.document.uid,
            documentId: destinationId,
            locale: locale.locale,
            data: draftData,
            status: "draft",
          })
        }
      }
      onProgress?.("relations", index + 1, actions.length)
    }
    return { created, updated, skipped, failed, issues, rollback: { attempted: false, completed: false, failures: [] } }
  } catch (error) {
    failed += 1
    const message = error instanceof Error ? error.message : "Import failed."
    issues.push(issue("error", "IMPORT_FAILED", message))
    const rollbackReport = await rollbackImport(ports, source, options, rollback)
    return {
      created,
      updated,
      skipped,
      failed,
      issues,
      rollback: rollbackReport,
    }
  }
}

const resolveExternalRelations = async (
  value: unknown,
  ports: IdentityPorts,
  cache: Map<string, string | null>
): Promise<void> => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      await resolveExternalRelations(entry, ports, cache)
    }
    return
  }
  if (!value || typeof value !== "object") {
    return
  }
  if ("$ref" in value) {
    const relation = (value as { $ref: RelationRef }).$ref
    const key = decisionKey(relation.uid, relation.documentId)
    if (!cache.has(key)) {
      const byId = await ports.findByDocumentId(relation.uid, relation.documentId, relation.locale ?? null)
      if (byId) {
        cache.set(key, byId.documentId)
      } else if (relation.identity) {
        let found: string | null = null
        for (const [field, fieldValue] of Object.entries(relation.identity)) {
          const match = await ports.findByField(relation.uid, field, fieldValue, relation.locale ?? null)
          if (match) {
            found = match.documentId
            break
          }
        }
        cache.set(key, found)
      } else {
        cache.set(key, null)
      }
    }
    return
  }
  for (const entry of Object.values(value as Record<string, unknown>)) {
    await resolveExternalRelations(entry, ports, cache)
  }
}

const rollbackImport = async (
  ports: WritePorts,
  source: SchemaSource,
  options: ImportOptions,
  record: RollbackRecord
): Promise<ExecuteResult["rollback"]> => {
  const failures: string[] = []
  for (const created of record.created) {
    try {
      await ports.delete(created)
    } catch (error) {
      failures.push(`Could not delete created ${created.uid} ${created.documentId}: ${error instanceof Error ? error.message : "unknown error"}`)
    }
  }
  for (const snapshot of record.updated) {
    try {
      const model = source.getModel(snapshot.uid)
      if (!model) {
        failures.push(`Could not restore ${snapshot.uid} because its schema is missing.`)
        continue
      }
      for (const locale of snapshot.locales) {
        const publication = planPublication(locale, "preserve", hasDraftAndPublish(model))
        const restoredMedia = new Map<string, number>()
        for (const media of collectMediaRefs(publication.data)) {
          const id = await ports.findMediaId(media)
          const key = media.sha256 || media.hash || media.key || media.name
          if (typeof id === "number") {
            restoredMedia.set(key, id)
          }
        }
        const data = deserializeAttributes(publication.data, model, {
          relationMode: "resolve",
          path: [],
          model: (uid) => {
            const nested = source.getModel(uid)
            if (!nested) {
              throw new Error(uid)
            }
            return nested
          },
          resolveMedia: (media) => {
            const key = media.sha256 || media.hash || media.key || media.name
            return restoredMedia.get(key) ?? null
          },
          resolveRelation: (relation) => relation.documentId,
        })
        await ports.update({
          uid: snapshot.uid,
          documentId: snapshot.documentId,
          locale: locale.locale,
          data,
          status: "draft",
        })
        if (publication.publish) {
          await ports.publish({ uid: snapshot.uid, documentId: snapshot.documentId, locale: locale.locale })
        }
      }
    } catch (error) {
      failures.push(`Could not restore ${snapshot.uid} ${snapshot.documentId}: ${error instanceof Error ? error.message : "unknown error"}`)
    }
  }
  return {
    attempted: true,
    completed: failures.length === 0,
    failures,
  }
}
