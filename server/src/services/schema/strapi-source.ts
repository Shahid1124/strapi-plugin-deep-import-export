import { BLOCKED_UID_PREFIXES } from "../utils/constants"
import { MemorySchemaSource, type AttributeSchema, type ModelSchema, type SchemaSource } from "./types"

interface StrapiModel {
  uid: string
  modelType?: "contentType" | "component"
  kind?: "collectionType" | "singleType"
  info?: { displayName?: string }
  options?: { draftAndPublish?: boolean }
  pluginOptions?: ModelSchema["pluginOptions"]
  attributes?: Record<string, AttributeSchema>
}

export interface StrapiSchemaHost {
  getModel(uid: string): StrapiModel | undefined
  contentTypes: Record<string, StrapiModel>
  components: Record<string, StrapiModel>
}

const toModel = (model: StrapiModel): ModelSchema => ({
  uid: model.uid,
  modelType: model.modelType ?? (model.uid.includes("::") ? "contentType" : "component"),
  kind: model.kind,
  displayName: model.info?.displayName,
  options: model.options,
  pluginOptions: model.pluginOptions,
  attributes: model.attributes ?? {},
})

export const isBlockedUid = (uid: string): boolean => BLOCKED_UID_PREFIXES.some((prefix) => uid.startsWith(prefix))

export const schemaSourceFromStrapi = (strapi: StrapiSchemaHost): SchemaSource => {
  const source = new MemorySchemaSource()
  const add = (model: StrapiModel | undefined) => {
    if (!model?.uid) {
      return
    }
    source.add(toModel(model))
  }
  Object.values(strapi.contentTypes).forEach(add)
  Object.values(strapi.components).forEach(add)
  return {
    getModel(uid: string) {
      return source.getModel(uid) ?? (() => {
        const model = strapi.getModel(uid)
        if (!model) {
          return undefined
        }
        const mapped = toModel(model)
        source.add(mapped)
        return mapped
      })()
    },
    contentTypes() {
      return source.contentTypes().filter((model) => !isBlockedUid(model.uid))
    },
    components() {
      return source.components()
    },
  }
}
