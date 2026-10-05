import { isMultipleRelation, isOwningRelation, isScalarAttribute } from "../schema/attributes"
import type { AttributeSchema, ModelSchema } from "../schema/types"
import { isMediaMarker, isRelationMarker, type MediaRef, type RelationRef } from "../serializer/types"

export interface DeserializeContext {
  relationMode: "omit" | "resolve"
  resolveMedia: (media: MediaRef) => number | null
  resolveRelation: (relation: RelationRef) => string | null
  onUnresolvedRelation?: (relation: RelationRef, path: string) => void
  path: string[]
  model: (uid: string) => ModelSchema
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

export const deserializeAttribute = (value: unknown, attribute: AttributeSchema, ctx: DeserializeContext): unknown => {
  if (value === undefined) {
    return undefined
  }
  if (attribute.type === "media") {
    const mapOne = (entry: unknown): number | null => {
      if (!isMediaMarker(entry)) {
        return null
      }
      return ctx.resolveMedia(entry.$media)
    }
    if (attribute.multiple) {
      return Array.isArray(value) ? value.map(mapOne).filter((id): id is number => typeof id === "number") : []
    }
    return mapOne(value)
  }
  if (attribute.type === "relation") {
    if (!isOwningRelation(attribute) || ctx.relationMode === "omit") {
      return undefined
    }
    const mapOne = (entry: unknown): string | null => {
      if (!isRelationMarker(entry)) {
        return null
      }
      const resolved = ctx.resolveRelation(entry.$ref)
      if (!resolved) {
        ctx.onUnresolvedRelation?.(entry.$ref, ctx.path.join("."))
      }
      return resolved
    }
    if (isMultipleRelation(attribute)) {
      const entries = Array.isArray(value) ? value : []
      const ids = entries.map(mapOne).filter((id): id is string => Boolean(id))
      if (entries.length > 0 && ids.length === 0) {
        return undefined
      }
      return { set: ids.map((documentId) => ({ documentId })) }
    }
    if (value === null) {
      return { set: [] }
    }
    const single = mapOne(value)
    if (!single) {
      return undefined
    }
    return { set: [{ documentId: single }] }
  }
  if (attribute.type === "component" && attribute.component) {
      const readOne = (entry: unknown, index: number) => {
      const record = asRecord(entry)
      if (!record || !attribute.component) {
        return null
      }
      return deserializeAttributes(record, ctx.model(attribute.component), {
        ...ctx,
        path: [...ctx.path, `${attribute.component}[${index}]`],
      })
    }
    if (attribute.repeatable) {
      return Array.isArray(value) ? value.map(readOne).filter(Boolean) : []
    }
    return readOne(value, 0)
  }
  if (attribute.type === "dynamiczone") {
    if (!Array.isArray(value)) {
      return []
    }
    return value.map((entry, index) => {
      const record = asRecord(entry)
      const componentUid = typeof record?.__component === "string" ? record.__component : ""
      if (!record || !componentUid) {
        return null
      }
      const data = deserializeAttributes(record, ctx.model(componentUid), {
        ...ctx,
        path: [...ctx.path, `${componentUid}[${index}]`],
      })
      return { __component: componentUid, ...data }
    }).filter(Boolean)
  }
  if (isScalarAttribute(attribute) || attribute.customField) {
    if (attribute.type === "json" || attribute.type === "blocks") {
      return value === null ? null : JSON.parse(JSON.stringify(value))
    }
    return value
  }
  return undefined
}

export const deserializeAttributes = (
  data: Record<string, unknown>,
  model: ModelSchema | undefined,
  ctx: DeserializeContext
): Record<string, unknown> => {
  if (!model) {
    return {}
  }
  const output: Record<string, unknown> = {}
  for (const [name, attribute] of Object.entries(model.attributes)) {
    if (!(name in data) || name === "__component") {
      continue
    }
    const deserialized = deserializeAttribute(data[name], attribute, { ...ctx, path: [...ctx.path, name] })
    if (deserialized !== undefined) {
      output[name] = deserialized
    }
  }
  return output
}
