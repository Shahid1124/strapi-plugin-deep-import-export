import { SCALAR_TYPES, SYSTEM_ATTRIBUTE_NAMES } from "../utils/constants"
import type { AttributeSchema, ModelSchema } from "./types"

export const isScalarAttribute = (attribute: AttributeSchema): boolean => {
  if (attribute.type === "password") {
    return false
  }
  return SCALAR_TYPES.has(attribute.type) || Boolean(attribute.customField)
}

export const isOwningRelation = (attribute: AttributeSchema): boolean => {
  return attribute.type === "relation" && !attribute.mappedBy && !isMorphRelation(attribute)
}

export const isMorphRelation = (attribute: AttributeSchema): boolean => {
  return attribute.type === "relation" && Boolean(attribute.relation?.toLowerCase().startsWith("morph"))
}

export const isMultipleRelation = (attribute: AttributeSchema): boolean => {
  return attribute.relation === "oneToMany" || attribute.relation === "manyToMany"
}

export const isExportableAttribute = (name: string, attribute: AttributeSchema): boolean => {
  if (SYSTEM_ATTRIBUTE_NAMES.has(name)) {
    return false
  }
  if (attribute.private || attribute.type === "password") {
    return false
  }
  if (name === "createdBy" || name === "updatedBy" || name === "localizations") {
    return false
  }
  return true
}

export const identityFields = (model: ModelSchema): string[] => {
  const fields: string[] = []
  for (const [name, attribute] of Object.entries(model.attributes)) {
    if (!isExportableAttribute(name, attribute) || !isScalarAttribute(attribute)) {
      continue
    }
    if (attribute.unique || attribute.type === "uid" || name === "slug") {
      fields.push(name)
    }
  }
  return fields
}

export const labelFields = (model: ModelSchema): string[] => {
  const preferred = ["title", "name", "label", "slug", "pathname"]
  return preferred.filter((name) => {
    const attribute = model.attributes[name]
    return attribute ? isScalarAttribute(attribute) : false
  })
}

export const isLocalized = (model: ModelSchema): boolean => {
  return model.pluginOptions?.i18n?.localized === true
}

export const hasDraftAndPublish = (model: ModelSchema): boolean => {
  return model.options?.draftAndPublish === true
}
