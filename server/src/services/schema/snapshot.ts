import type { AttributeSchema, ModelSchema, SchemaSource } from "./types"

const PUBLIC_ATTRIBUTE_KEYS: Array<keyof AttributeSchema> = [
  "type",
  "required",
  "unique",
  "repeatable",
  "multiple",
  "component",
  "components",
  "relation",
  "target",
  "mappedBy",
  "inversedBy",
  "enum",
  "customField",
  "allowedTypes",
  "targetField",
]

const sanitizeAttribute = (attribute: AttributeSchema): AttributeSchema => {
  const next: AttributeSchema = { type: attribute.type }
  for (const key of PUBLIC_ATTRIBUTE_KEYS) {
    const value = attribute[key]
    if (value !== undefined) {
      Object.assign(next, { [key]: value })
    }
  }
  if (attribute.pluginOptions?.i18n) {
    next.pluginOptions = { i18n: { localized: attribute.pluginOptions.i18n.localized } }
  }
  return next
}

export const sanitizeModel = (model: ModelSchema): ModelSchema => {
  const attributes: Record<string, AttributeSchema> = {}
  for (const [name, attribute] of Object.entries(model.attributes)) {
    if (attribute.private || attribute.type === "password") {
      continue
    }
    attributes[name] = sanitizeAttribute(attribute)
  }
  return {
    uid: model.uid,
    modelType: model.modelType,
    kind: model.kind,
    displayName: model.displayName,
    options: model.options?.draftAndPublish === undefined ? undefined : { draftAndPublish: model.options.draftAndPublish },
    pluginOptions: model.pluginOptions?.i18n
      ? { i18n: { localized: model.pluginOptions.i18n.localized } }
      : undefined,
    attributes,
  }
}

export interface SchemaSnapshot {
  contentTypes: Record<string, ModelSchema>
  components: Record<string, ModelSchema>
}

/**
 * Snapshot only the models reachable from the exported content types, including
 * nested components and relation targets. Database table names and secrets are omitted.
 */
export const buildSchemaSnapshot = (source: SchemaSource, contentTypeUids: string[]): SchemaSnapshot => {
  const contentTypes: Record<string, ModelSchema> = {}
  const components: Record<string, ModelSchema> = {}
  const pendingContentTypes = [...contentTypeUids]
  const seenContentTypes = new Set<string>()

  const visitComponent = (uid: string, stack: string[]) => {
    if (components[uid] || stack.includes(uid)) {
      return
    }
    const model = source.getModel(uid)
    if (!model) {
      return
    }
    components[uid] = sanitizeModel(model)
    const nextStack = [...stack, uid]
    for (const attribute of Object.values(model.attributes)) {
      if (attribute.type === "component" && attribute.component) {
        visitComponent(attribute.component, nextStack)
      }
      if (attribute.type === "dynamiczone") {
        for (const componentUid of attribute.components ?? []) {
          visitComponent(componentUid, nextStack)
        }
      }
      if (attribute.type === "relation" && attribute.target && !seenContentTypes.has(attribute.target)) {
        pendingContentTypes.push(attribute.target)
      }
    }
  }

  while (pendingContentTypes.length > 0) {
    const uid = pendingContentTypes.pop() as string
    if (seenContentTypes.has(uid)) {
      continue
    }
    seenContentTypes.add(uid)
    const model = source.getModel(uid)
    if (!model || model.modelType !== "contentType") {
      continue
    }
    contentTypes[uid] = sanitizeModel(model)
    for (const attribute of Object.values(model.attributes)) {
      if (attribute.type === "component" && attribute.component) {
        visitComponent(attribute.component, [])
      }
      if (attribute.type === "dynamiczone") {
        for (const componentUid of attribute.components ?? []) {
          visitComponent(componentUid, [])
        }
      }
      if (attribute.type === "relation" && attribute.target) {
        pendingContentTypes.push(attribute.target)
      }
    }
  }

  return { contentTypes, components }
}
