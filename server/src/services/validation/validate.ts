import { hasDraftAndPublish, isLocalized, isOwningRelation, isScalarAttribute } from "../schema/attributes"
import type { AttributeSchema, ModelSchema, SchemaSource } from "../schema/types"
import { isMediaMarker, isRelationMarker, type ExportedDocument, type Manifest, type SchemaSnapshotFile } from "../serializer/types"
import { SUPPORTED_FORMAT_MAJOR, SUPPORTED_STRAPI_MAJOR } from "../utils/constants"
import { issue, type StructuredIssue } from "../utils/errors"

export interface PackageStats {
  contentTypes: number
  entries: number
  components: number
  dynamicZones: number
  relations: number
  media: number
}

const emptyStats = (): PackageStats => ({
  contentTypes: 0,
  entries: 0,
  components: 0,
  dynamicZones: 0,
  relations: 0,
  media: 0,
})

const isObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export const parseVersion = (version: string): { major: number; minor: number } => {
  const [major, minor] = String(version).split(".").map((part) => Number(part))
  return { major: Number.isFinite(major) ? major : 0, minor: Number.isFinite(minor) ? minor : 0 }
}

export const validateManifest = (manifest: unknown): StructuredIssue[] => {
  const issues: StructuredIssue[] = []
  if (!isObject(manifest)) {
    return [issue("error", "MALFORMED_MANIFEST", "manifest.json must be a JSON object.")]
  }
  const format = parseVersion(String(manifest.formatVersion ?? ""))
  if (format.major !== SUPPORTED_FORMAT_MAJOR) {
    issues.push(
      issue(
        "error",
        "INCOMPATIBLE_FORMAT",
        `Export package format ${String(manifest.formatVersion)} is not supported. This plugin reads format ${SUPPORTED_FORMAT_MAJOR}.x.`
      )
    )
  }
  const strapiVersion = parseVersion(String(manifest.strapiVersion ?? manifest.strapiMajorVersion ?? ""))
  const major = typeof manifest.strapiMajorVersion === "number" ? manifest.strapiMajorVersion : strapiVersion.major
  if (major !== SUPPORTED_STRAPI_MAJOR) {
    issues.push(
      issue(
        "error",
        "INCOMPATIBLE_STRAPI",
        `Export package was created with Strapi ${major || "unknown"}. This project runs Strapi ${SUPPORTED_STRAPI_MAJOR}.x. Import is blocked.`
      )
    )
  }
  if (manifest.plugin && manifest.plugin !== "deep-import-export") {
    issues.push(issue("error", "UNKNOWN_PLUGIN_FORMAT", "This archive was not created by the deep import/export plugin."))
  }
  return issues
}

const typeCompatible = (attribute: AttributeSchema, value: unknown): boolean => {
  if (value === null) {
    return true
  }
  switch (attribute.type) {
    case "boolean":
      return typeof value === "boolean"
    case "integer":
    case "float":
    case "decimal":
      return typeof value === "number"
    case "biginteger":
      return typeof value === "number" || typeof value === "string"
    case "string":
    case "text":
    case "richtext":
    case "email":
    case "uid":
    case "date":
    case "time":
    case "datetime":
      return typeof value === "string"
    case "enumeration":
      return typeof value === "string" && (!attribute.enum || attribute.enum.includes(value))
    case "json":
    case "blocks":
      return true
    default:
      return true
  }
}

const walkValue = (
  value: unknown,
  attribute: AttributeSchema,
  path: string,
  source: SchemaSource,
  issues: StructuredIssue[],
  stats: PackageStats,
  publishing: boolean
): void => {
  if (attribute.type === "media") {
    const entries = attribute.multiple ? (Array.isArray(value) ? value : []) : value === null ? [] : [value]
    entries.forEach((entry) => {
      if (entry === null) {
        return
      }
      if (!isMediaMarker(entry)) {
        issues.push(issue("error", "INVALID_MEDIA", `Media field ${path} is not a media reference.`, { path }))
        return
      }
      stats.media += 1
    })
    return
  }
  if (attribute.type === "relation") {
    if (!isOwningRelation(attribute)) {
      return
    }
    const entries = isMultiple(attribute) ? (Array.isArray(value) ? value : []) : value === null ? [] : [value]
    entries.forEach((entry) => {
      if (entry === null) {
        return
      }
      if (!isRelationMarker(entry)) {
        issues.push(issue("error", "INVALID_RELATION", `Relation field ${path} is not a stable reference.`, { path }))
        return
      }
      stats.relations += 1
      if (!source.getModel(entry.$ref.uid)) {
        issues.push(
          issue(
            "error",
            "MISSING_RELATION_TARGET",
            `Unable to resolve relation target ${entry.$ref.uid}. The destination does not define that content type.`,
            { path, uid: entry.$ref.uid, documentId: entry.$ref.documentId }
          )
        )
      }
    })
    return
  }
  if (attribute.type === "component" && attribute.component) {
    const model = source.getModel(attribute.component)
    if (!model) {
      issues.push(
        issue("error", "MISSING_COMPONENT", `Component ${attribute.component} does not exist on this Strapi instance.`, {
          path,
          component: attribute.component,
        })
      )
      return
    }
    const entries = attribute.repeatable ? (Array.isArray(value) ? value : []) : value === null ? [] : [value]
    if (attribute.repeatable && !Array.isArray(value) && value != null) {
      issues.push(issue("error", "INVALID_REPEATABLE", `Repeatable component ${path} must be an array.`, { path }))
    }
    entries.forEach((entry, index) => {
      if (!isObject(entry)) {
        issues.push(issue("error", "INVALID_COMPONENT", `Component ${path}[${index}] must be an object.`, { path }))
        return
      }
      stats.components += 1
      walkData(entry, model, `${path}[${index}]`, source, issues, stats, publishing)
    })
    return
  }
  if (attribute.type === "dynamiczone") {
    if (!Array.isArray(value)) {
      issues.push(issue("error", "INVALID_DYNAMIC_ZONE", `Dynamic zone ${path} must be an array.`, { path }))
      return
    }
    const allowed = new Set(attribute.components ?? [])
    value.forEach((entry, index) => {
      if (!isObject(entry) || typeof entry.__component !== "string") {
        issues.push(
          issue("error", "INVALID_DYNAMIC_ZONE", `Dynamic zone item ${path}[${index}] is missing __component.`, { path })
        )
        return
      }
      const componentUid = entry.__component
      if (!allowed.has(componentUid)) {
        issues.push(
          issue(
            "error",
            "INVALID_DYNAMIC_ZONE_COMPONENT",
            `Component ${componentUid} is not allowed in dynamic zone ${path}.`,
            { path, component: componentUid }
          )
        )
        return
      }
      const model = source.getModel(componentUid)
      if (!model) {
        issues.push(issue("error", "MISSING_COMPONENT", `Component ${componentUid} does not exist.`, { path, component: componentUid }))
        return
      }
      stats.dynamicZones += 1
      stats.components += 1
      walkData(entry, model, `${path}[${index}]`, source, issues, stats, publishing)
    })
    return
  }
  if ((isScalarAttribute(attribute) || attribute.customField) && !typeCompatible(attribute, value)) {
    issues.push(
      issue("error", "INVALID_TYPE", `Field ${path} expected ${attribute.type} but received ${Array.isArray(value) ? "array" : typeof value}.`, {
        path,
        type: attribute.type,
      })
    )
  }
}

const isMultiple = (attribute: AttributeSchema): boolean => {
  return attribute.relation === "oneToMany" || attribute.relation === "manyToMany" || attribute.multiple === true
}

const walkData = (
  data: Record<string, unknown>,
  model: ModelSchema,
  path: string,
  source: SchemaSource,
  issues: StructuredIssue[],
  stats: PackageStats,
  publishing: boolean
): void => {
  for (const [name, value] of Object.entries(data)) {
    if (name === "__component") {
      continue
    }
    const attribute = model.attributes[name]
    if (!attribute) {
      issues.push(
        issue("warning", "UNKNOWN_FIELD", `Field ${path}.${name} is not in the destination schema and will be ignored.`, {
          path: `${path}.${name}`,
        })
      )
      continue
    }
    walkValue(value, attribute, `${path}.${name}`, source, issues, stats, publishing)
  }
  if (publishing) {
    for (const [name, attribute] of Object.entries(model.attributes)) {
      if (attribute.required && (data[name] === undefined || data[name] === null || data[name] === "")) {
        issues.push(
          issue("warning", "MISSING_REQUIRED", `Required field ${path}.${name} is empty. Publishing may be rejected by Strapi.`, {
            path: `${path}.${name}`,
          })
        )
      }
    }
  }
}

export interface ValidationResult {
  issues: StructuredIssue[]
  stats: PackageStats
  documents: ExportedDocument[]
}

export const validatePackage = (
  manifest: Manifest,
  documents: unknown,
  schemas: SchemaSnapshotFile | undefined,
  destination: SchemaSource,
  publishing: boolean
): ValidationResult => {
  const issues = validateManifest(manifest)
  const stats = emptyStats()
  if (!Array.isArray(documents)) {
    issues.push(issue("error", "MALFORMED_DATA", "data.json must contain a documents array."))
    return { issues, stats, documents: [] }
  }

  const parsed: ExportedDocument[] = []
  const seenTypes = new Set<string>()
  documents.forEach((entry, index) => {
    if (!isObject(entry) || typeof entry.uid !== "string" || typeof entry.documentId !== "string" || !Array.isArray(entry.locales)) {
      issues.push(issue("error", "MALFORMED_DOCUMENT", `Document at index ${index} is missing uid, documentId, or locales.`))
      return
    }
    const model = destination.getModel(entry.uid)
    if (!model || model.modelType !== "contentType") {
      issues.push(
        issue("error", "MISSING_CONTENT_TYPE", `Content type ${entry.uid} does not exist on this Strapi instance.`, {
          uid: entry.uid,
          documentId: entry.documentId,
        })
      )
      return
    }
    const sourceSchema = schemas?.contentTypes?.[entry.uid]
    if (sourceSchema) {
      for (const name of Object.keys(sourceSchema.attributes)) {
        if (!model.attributes[name] && name !== "createdBy" && name !== "updatedBy") {
          issues.push(
            issue("warning", "SCHEMA_FIELD_MISSING", `Destination ${entry.uid} has no field ${name} that the export expected.`, {
              uid: entry.uid,
              field: name,
            })
          )
        }
      }
    }
    if (!seenTypes.has(entry.uid)) {
      seenTypes.add(entry.uid)
      stats.contentTypes += 1
    }
    stats.entries += 1
    const document = entry as unknown as ExportedDocument
    if (!isLocalized(model) && document.locales.length > 1) {
      issues.push(
        issue(
          "warning",
          "LOCALE_IGNORED",
          `${entry.uid} is not localized. Only the first locale in the package will be imported.`,
          { uid: entry.uid, documentId: entry.documentId }
        )
      )
    }
    if (!hasDraftAndPublish(model) && document.locales.some((locale) => locale.publicationState === "modified")) {
      issues.push(
        issue("warning", "DRAFT_PUBLISH_DISABLED", `${entry.uid} does not use draft and publish. Publication state will be flattened.`, {
          uid: entry.uid,
        })
      )
    }
    document.locales.forEach((locale) => {
      const version = locale.published?.data ?? locale.draft?.data
      if (!version) {
        issues.push(
          issue("error", "EMPTY_LOCALE", `Document ${entry.documentId} locale ${String(locale.locale)} has no data.`, {
            uid: entry.uid,
            documentId: entry.documentId,
            locale: locale.locale,
          })
        )
        return
      }
      walkData(version, model, document.uid, destination, issues, stats, publishing)
    })
    parsed.push(document)
  })

  return { issues, stats, documents: parsed }
}
