export const PLUGIN_ID = "deep-import-export"
export const FORMAT_VERSION = "1.0.0"
export const SUPPORTED_FORMAT_MAJOR = 1
export const SUPPORTED_STRAPI_MAJOR = 5

export const PACKAGE_FILES = {
  manifest: "manifest.json",
  data: "data.json",
  schemas: "schemas.json",
  readme: "README.md",
  mediaDir: "media/",
} as const

export const BLOCKED_UID_PREFIXES = ["admin::", "plugin::"]

export const SYSTEM_ATTRIBUTE_NAMES = new Set([
  "id",
  "documentId",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "createdBy",
  "updatedBy",
  "locale",
  "localizations",
])

export const SCALAR_TYPES = new Set([
  "string",
  "text",
  "richtext",
  "blocks",
  "json",
  "integer",
  "biginteger",
  "float",
  "decimal",
  "boolean",
  "date",
  "time",
  "datetime",
  "enumeration",
  "uid",
  "email",
  "password",
])

export const DEFAULT_CONFIG = {
  maxArchiveBytes: 200 * 1024 * 1024,
  maxRecursionDepth: 32,
  batchSize: 25,
  concurrency: 3,
  defaultConflictStrategy: "skip" as const,
  unresolvedRelations: "error" as const,
  storageDir: "",
}
