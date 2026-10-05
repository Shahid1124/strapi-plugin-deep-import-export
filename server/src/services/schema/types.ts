export type AttributeType =
  | "string"
  | "text"
  | "richtext"
  | "blocks"
  | "json"
  | "integer"
  | "biginteger"
  | "float"
  | "decimal"
  | "boolean"
  | "date"
  | "time"
  | "datetime"
  | "enumeration"
  | "uid"
  | "email"
  | "password"
  | "media"
  | "relation"
  | "component"
  | "dynamiczone"
  | string

export interface AttributeSchema {
  type: AttributeType
  required?: boolean
  unique?: boolean
  repeatable?: boolean
  multiple?: boolean
  component?: string
  components?: string[]
  relation?: string
  target?: string
  mappedBy?: string
  inversedBy?: string
  enum?: string[]
  customField?: string
  allowedTypes?: string[]
  targetField?: string
  private?: boolean
  pluginOptions?: {
    i18n?: {
      localized?: boolean
    }
  }
}

export interface ModelSchema {
  uid: string
  modelType: "contentType" | "component"
  kind?: "collectionType" | "singleType"
  displayName?: string
  options?: {
    draftAndPublish?: boolean
  }
  pluginOptions?: {
    i18n?: {
      localized?: boolean
    }
  }
  attributes: Record<string, AttributeSchema>
}

export interface SchemaSource {
  getModel(uid: string): ModelSchema | undefined
  contentTypes(): ModelSchema[]
  components(): ModelSchema[]
}

export class MemorySchemaSource implements SchemaSource {
  private readonly models = new Map<string, ModelSchema>()

  constructor(models: ModelSchema[] = []) {
    models.forEach((model) => this.models.set(model.uid, model))
  }

  add(model: ModelSchema): void {
    this.models.set(model.uid, model)
  }

  getModel(uid: string): ModelSchema | undefined {
    return this.models.get(uid)
  }

  contentTypes(): ModelSchema[] {
    return [...this.models.values()].filter((model) => model.modelType === "contentType")
  }

  components(): ModelSchema[] {
    return [...this.models.values()].filter((model) => model.modelType === "component")
  }
}
