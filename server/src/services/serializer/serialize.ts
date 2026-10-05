import { identityFields, isExportableAttribute, isMultipleRelation, isScalarAttribute } from "../schema/attributes"
import type { AttributeSchema, ModelSchema, SchemaSource } from "../schema/types"
import { ImportExportError } from "../utils/errors"
import {
  emptyStats,
  isMediaMarker,
  type ExportStats,
  type MediaRef,
  type RelationRef,
  type SerializerOptions,
} from "./types"

export interface SerializeContext {
  source: SchemaSource
  options: SerializerOptions
  stats: ExportStats
  depth: number
  seen: WeakSet<object>
  path: string[]
  onMedia?: (raw: Record<string, unknown>, ref: MediaRef) => void
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

const scalarIdentity = (model: ModelSchema | undefined, value: Record<string, unknown>): Record<string, string | number | boolean> => {
  if (!model) {
    return {}
  }
  const identity: Record<string, string | number | boolean> = {}
  for (const field of identityFields(model)) {
    const fieldValue = value[field]
    if (typeof fieldValue === "string" || typeof fieldValue === "number" || typeof fieldValue === "boolean") {
      identity[field] = fieldValue
    }
  }
  return identity
}

const toMediaRef = (value: Record<string, unknown>): MediaRef => {
  const sizeInBytes = typeof value.sizeInBytes === "number" ? value.sizeInBytes : typeof value.size === "number" ? Math.round(value.size * 1024) : null
  return {
    documentId: typeof value.documentId === "string" ? value.documentId : undefined,
    hash: typeof value.hash === "string" ? value.hash : undefined,
    name: typeof value.name === "string" ? value.name : "file",
    alternativeText: typeof value.alternativeText === "string" ? value.alternativeText : null,
    caption: typeof value.caption === "string" ? value.caption : null,
    mime: typeof value.mime === "string" ? value.mime : null,
    ext: typeof value.ext === "string" ? value.ext : null,
    size: typeof value.size === "number" ? value.size : null,
    sizeInBytes,
    width: typeof value.width === "number" ? value.width : null,
    height: typeof value.height === "number" ? value.height : null,
  }
}

const toRelationRef = (value: Record<string, unknown>, attribute: AttributeSchema, source: SchemaSource): RelationRef | null => {
  const documentId = value.documentId
  if (typeof documentId !== "string" || !attribute.target) {
    return null
  }
  const target = source.getModel(attribute.target)
  return {
    uid: attribute.target,
    documentId,
    locale: typeof value.locale === "string" ? value.locale : null,
    identity: scalarIdentity(target, value),
  }
}

export const createSerializeContext = (source: SchemaSource, options: SerializerOptions): SerializeContext => ({
  source,
  options,
  stats: emptyStats(),
  depth: 0,
  seen: new WeakSet(),
  path: [],
})

const childContext = (ctx: SerializeContext, segment: string, deepen: boolean): SerializeContext => ({
  ...ctx,
  depth: deepen ? ctx.depth + 1 : ctx.depth,
  path: [...ctx.path, segment],
})

const assertDepth = (ctx: SerializeContext): void => {
  if (ctx.depth > ctx.options.maxDepth) {
    throw new ImportExportError(
      `Recursion depth exceeded ${ctx.options.maxDepth} at ${ctx.path.join(".") || "root"}. Increase maxRecursionDepth if this structure is legitimate.`,
      "MAX_DEPTH",
      { path: ctx.path.join("."), maxDepth: ctx.options.maxDepth }
    )
  }
}

const serializeMediaValue = (value: unknown, multiple: boolean, ctx: SerializeContext): unknown => {
  const toMarker = (entry: unknown) => {
    const record = asRecord(entry)
    if (!record) {
      return null
    }
    const ref = toMediaRef(record)
    ctx.onMedia?.(record, ref)
    ctx.stats.mediaCount += 1
    return { $media: ref }
  }
  if (multiple) {
    return Array.isArray(value) ? value.map((entry) => toMarker(entry)).filter(Boolean) : []
  }
  return toMarker(value)
}

const serializeRelationValue = (value: unknown, attribute: AttributeSchema, ctx: SerializeContext): unknown => {
  if (!ctx.options.includeRelations) {
    return undefined
  }
  const toMarker = (entry: unknown) => {
    const record = asRecord(entry)
    if (!record) {
      return null
    }
    const ref = toRelationRef(record, attribute, ctx.source)
    if (!ref) {
      return null
    }
    ctx.stats.relationCount += 1
    return { $ref: ref }
  }
  if (isMultipleRelation(attribute)) {
    return Array.isArray(value) ? value.map((entry) => toMarker(entry)).filter(Boolean) : []
  }
  return toMarker(value)
}

const serializeComponentValue = (
  value: unknown,
  componentUid: string,
  repeatable: boolean,
  ctx: SerializeContext
): unknown => {
  const model = ctx.source.getModel(componentUid)
  const serializeOne = (entry: unknown, index: number) => {
    const record = asRecord(entry)
    if (!record || !model) {
      return null
    }
    if (ctx.seen.has(record)) {
      throw new ImportExportError(
        `Circular component structure detected at ${ctx.path.join(".")}`,
        "CIRCULAR_COMPONENT",
        { path: ctx.path.join("."), component: componentUid }
      )
    }
    ctx.seen.add(record)
    ctx.stats.componentCount += 1
    const next = childContext(ctx, `${componentUid}[${index}]`, true)
    assertDepth(next)
    return serializeAttributes(record, model, next)
  }
  if (repeatable) {
    return Array.isArray(value) ? value.map((entry, index) => serializeOne(entry, index)).filter(Boolean) : []
  }
  return serializeOne(value, 0)
}

const serializeDynamicZone = (value: unknown, attribute: AttributeSchema, ctx: SerializeContext): unknown[] => {
  if (!Array.isArray(value)) {
    return []
  }
  const allowed = new Set(attribute.components ?? [])
  return value.map((entry, index) => {
    const record = asRecord(entry)
    const componentUid = typeof record?.__component === "string" ? record.__component : ""
    if (!record || !componentUid) {
      return null
    }
    if (allowed.size > 0 && !allowed.has(componentUid)) {
      throw new ImportExportError(
        `Dynamic zone component "${componentUid}" is not allowed by the schema at ${ctx.path.join(".")}`,
        "INVALID_DYNAMIC_ZONE",
        { path: ctx.path.join("."), component: componentUid }
      )
    }
    const model = ctx.source.getModel(componentUid)
    if (!model) {
      throw new ImportExportError(
        `Cannot serialize dynamic zone component "${componentUid}" because its schema was not found.`,
        "MISSING_COMPONENT",
        { component: componentUid, path: ctx.path.join(".") }
      )
    }
    if (ctx.seen.has(record)) {
      throw new ImportExportError("Circular dynamic zone structure detected.", "CIRCULAR_COMPONENT", {
        path: ctx.path.join("."),
        component: componentUid,
      })
    }
    ctx.seen.add(record)
    ctx.stats.dynamicZoneCount += 1
    ctx.stats.componentCount += 1
    const next = childContext(ctx, `${componentUid}[${index}]`, true)
    assertDepth(next)
    return {
      __component: componentUid,
      ...serializeAttributes(record, model, next),
    }
  }).filter((entry): entry is Record<string, unknown> & { __component: string } => Boolean(entry))
}

const serializeScalar = (value: unknown, attribute: AttributeSchema): unknown => {
  if (value === undefined) {
    return undefined
  }
  if (attribute.type === "json" || attribute.type === "blocks" || attribute.customField) {
    return value === null ? null : JSON.parse(JSON.stringify(value))
  }
  return value
}

export const serializeAttribute = (value: unknown, attribute: AttributeSchema, ctx: SerializeContext): unknown => {
  if (value === undefined) {
    return undefined
  }
  if (attribute.type === "media") {
    return serializeMediaValue(value, Boolean(attribute.multiple), ctx)
  }
  if (attribute.type === "relation") {
    return serializeRelationValue(value, attribute, ctx)
  }
  if (attribute.type === "component" && attribute.component) {
    return serializeComponentValue(value, attribute.component, Boolean(attribute.repeatable), ctx)
  }
  if (attribute.type === "dynamiczone") {
    return serializeDynamicZone(value, attribute, ctx)
  }
  if (isScalarAttribute(attribute) || attribute.customField) {
    return serializeScalar(value, attribute)
  }
  return undefined
}

export const serializeAttributes = (
  data: Record<string, unknown>,
  model: ModelSchema,
  ctx: SerializeContext
): Record<string, unknown> => {
  const output: Record<string, unknown> = {}
  for (const [name, attribute] of Object.entries(model.attributes)) {
    if (!isExportableAttribute(name, attribute)) {
      continue
    }
    if (!(name in data)) {
      continue
    }
    const serialized = serializeAttribute(data[name], attribute, childContext(ctx, name, false))
    if (serialized !== undefined) {
      output[name] = serialized
    }
  }
  return output
}

export const collectMediaRefs = (value: unknown, into: MediaRef[] = []): MediaRef[] => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectMediaRefs(entry, into))
    return into
  }
  if (isMediaMarker(value)) {
    into.push(value.$media)
    return into
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((entry) => collectMediaRefs(entry, into))
  }
  return into
}
