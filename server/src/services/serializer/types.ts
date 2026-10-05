import type { ModelSchema } from "../schema/types"

export type PublicationState = "draft" | "published" | "modified" | "unversioned"
export type ConflictStrategy = "skip" | "update" | "create" | "ask"
export type PublishMode = "draft" | "publish" | "preserve"
export type UnresolvedRelationPolicy = "error" | "warn"

export interface MediaRef {
  key?: string
  sha256?: string
  documentId?: string
  hash?: string
  name: string
  alternativeText?: string | null
  caption?: string | null
  mime?: string | null
  ext?: string | null
  size?: number | null
  sizeInBytes?: number | null
  width?: number | null
  height?: number | null
}

export interface RelationRef {
  uid: string
  documentId: string
  locale?: string | null
  identity?: Record<string, string | number | boolean>
}

export interface MediaMarker {
  $media: MediaRef
}

export interface RelationMarker {
  $ref: RelationRef
}

export interface ExportedVersion {
  data: Record<string, unknown>
}

export interface ExportedLocale {
  locale: string | null
  publicationState: PublicationState
  draft: ExportedVersion | null
  published: ExportedVersion | null
}

export interface ExportedDocument {
  uid: string
  kind: "collectionType" | "singleType"
  documentId: string
  identity: Record<string, string | number | boolean>
  locales: ExportedLocale[]
}

export interface Manifest {
  formatVersion: string
  strapiVersion: string
  strapiMajorVersion: number
  strapiMinorVersion: number
  exportedAt: string
  sourceEnvironment: string
  locales: string[]
  contentTypes: string[]
  components: string[]
  mediaCount: number
  relationCount: number
  entryCount: number
  componentCount: number
  dynamicZoneCount: number
  includeMedia: boolean
  includeRelations: boolean
  plugin: "deep-import-export"
}

export interface SchemaSnapshotFile {
  contentTypes: Record<string, ModelSchema>
  components: Record<string, ModelSchema>
}

export interface DataFile {
  documents: ExportedDocument[]
}

export interface ExportPackage {
  manifest: Manifest
  data: DataFile
  schemas: SchemaSnapshotFile
  readme: string
  media: Map<string, Buffer>
}

export interface ExportStats {
  mediaCount: number
  relationCount: number
  componentCount: number
  dynamicZoneCount: number
}

export const emptyStats = (): ExportStats => ({
  mediaCount: 0,
  relationCount: 0,
  componentCount: 0,
  dynamicZoneCount: 0,
})

export const isMediaMarker = (value: unknown): value is MediaMarker => {
  return Boolean(value && typeof value === "object" && "$media" in value && (value as MediaMarker).$media?.name)
}

export const isRelationMarker = (value: unknown): value is RelationMarker => {
  return Boolean(
    value &&
      typeof value === "object" &&
      "$ref" in value &&
      typeof (value as RelationMarker).$ref?.uid === "string" &&
      typeof (value as RelationMarker).$ref?.documentId === "string"
  )
}

export interface SerializerOptions {
  includeRelations: boolean
  maxDepth: number
}

export interface ImportOptions {
  conflictStrategy: ConflictStrategy
  publishMode: PublishMode
  unresolvedRelations: UnresolvedRelationPolicy
  locales?: string[]
  localeMap?: Record<string, string>
  decisions?: Record<string, Exclude<ConflictStrategy, "ask">>
  dryRun?: boolean
}

export const decisionKey = (uid: string, documentId: string): string => `${uid}:${documentId}`
