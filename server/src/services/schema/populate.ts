import { isMorphRelation } from "./attributes"
import { identityFields } from "./attributes"
import type { SchemaSource } from "./types"

export const buildPopulate = (
  uid: string,
  source: SchemaSource,
  maxDepth: number,
  depth = 0
): Record<string, unknown> | undefined => {
  if (depth > maxDepth) {
    return undefined
  }
  const model = source.getModel(uid)
  if (!model) {
    return undefined
  }

  const populate: Record<string, unknown> = {}
  for (const [name, attribute] of Object.entries(model.attributes)) {
    if (attribute.type === "media") {
      populate[name] = true
      continue
    }
    if (attribute.type === "relation") {
      if (isMorphRelation(attribute) || !attribute.target) {
        continue
      }
      const target = source.getModel(attribute.target)
      const fields = ["documentId"]
      if (target) {
        for (const field of identityFields(target)) {
          if (!fields.includes(field)) {
            fields.push(field)
          }
        }
      }
      populate[name] = { fields }
      continue
    }
    if (attribute.type === "component" && attribute.component) {
      const nested = buildPopulate(attribute.component, source, maxDepth, depth + 1)
      populate[name] = nested ? { populate: nested } : true
      continue
    }
    if (attribute.type === "dynamiczone") {
      const on: Record<string, unknown> = {}
      for (const componentUid of attribute.components ?? []) {
        const nested = buildPopulate(componentUid, source, maxDepth, depth + 1)
        on[componentUid] = nested ? { populate: nested } : true
      }
      populate[name] = { on }
    }
  }

  return Object.keys(populate).length > 0 ? populate : undefined
}
