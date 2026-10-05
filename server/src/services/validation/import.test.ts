import assert from "node:assert/strict"
import { test } from "node:test"
import { fixtureSource, pageEntry } from "../../testing/fixture"
import { deserializeAttributes } from "../importer/deserialize"
import { planPublication } from "../importer/publication"
import { executeImport } from "../importer/execute"
import { matchDocument, strategyFor, type IdentityPorts } from "../resolver/identity"
import { matchMedia } from "../media/match"
import { createSerializeContext, serializeAttributes } from "../serializer/serialize"
import { validateManifest, validatePackage } from "../validation/validate"
import type { ExportedDocument, Manifest } from "../serializer/types"

const source = fixtureSource()
const model = source.getModel("api::website-page.website-page")!

const manifest = (overrides: Partial<Manifest> = {}): Manifest => ({
  formatVersion: "1.0.0",
  strapiVersion: "5.28.0",
  strapiMajorVersion: 5,
  strapiMinorVersion: 28,
  exportedAt: "2026-10-05T00:00:00.000Z",
  sourceEnvironment: "test",
  locales: ["en", "fr"],
  contentTypes: ["api::website-page.website-page"],
  components: [],
  mediaCount: 0,
  relationCount: 0,
  entryCount: 1,
  componentCount: 0,
  dynamicZoneCount: 0,
  includeMedia: true,
  includeRelations: true,
  plugin: "deep-import-export",
  ...overrides,
})

const documentFrom = (locale = "en", data = serialize()): ExportedDocument => ({
  uid: "api::website-page.website-page",
  kind: "collectionType",
  documentId: "page-1",
  identity: { slug: "about-us" },
  locales: [{ locale, publicationState: "published", draft: { data }, published: { data } }],
})

const serialize = () => {
  const context = createSerializeContext(source, { includeRelations: true, maxDepth: 12 })
  return serializeAttributes(pageEntry(), model, context)
}

test("blocks Strapi 4 packages and malformed manifests", () => {
  const incompatible = validateManifest(manifest({ strapiMajorVersion: 4, strapiVersion: "4.25.0" }))
  assert.equal(incompatible.some((issue) => issue.code === "INCOMPATIBLE_STRAPI"), true)
  const malformed = validatePackage(manifest(), { documents: true }, undefined, source, false)
  assert.equal(malformed.issues.some((issue) => issue.code === "MALFORMED_DATA"), true)
})

test("reports missing content types, components, and dynamic zone names before any write", () => {
  const broken = documentFrom()
  const sections = (broken.locales[0].draft?.data.sections ?? []) as Array<Record<string, unknown>>
  sections.push({ __component: "sections.missing", title: "Nope" })
  const result = validatePackage(manifest(), [broken, { uid: "api::missing.missing", documentId: "x", locales: [] }], undefined, source, true)
  assert.equal(result.issues.some((issue) => issue.code === "MISSING_CONTENT_TYPE"), true)
  assert.equal(result.issues.some((issue) => issue.code === "INVALID_DYNAMIC_ZONE_COMPONENT"), true)
  assert.equal(result.stats.dynamicZones > 0, true)
})

test("matches identity by mapping, documentId, unique field, then slug", async () => {
  const document = documentFrom()
  const calls: string[] = []
  const ports: IdentityPorts = {
    async findByDocumentId() {
      calls.push("documentId")
      return null
    },
    async findByField(_uid, field) {
      calls.push(field)
      return field === "slug" ? { documentId: "dest-slug", via: "slug" } : null
    },
    async findSingle() {
      return null
    },
  }
  const mapped = await matchDocument(document, ports, { locale: "en", idMap: { "api::website-page.website-page:page-1": "mapped" } })
  assert.equal(mapped?.documentId, "mapped")
  const bySlug = await matchDocument(document, ports, { locale: "en" })
  assert.equal(bySlug?.via, "slug")
  assert.deepEqual(calls, ["documentId", "slug"])
})

test("does not overwrite existing documents when the strategy is skip or undecided", () => {
  assert.deepEqual(strategyFor("skip", true, undefined, "collectionType"), { action: "skip" })
  assert.equal(strategyFor("ask", true, undefined, "collectionType").error?.includes("Choose"), true)
  assert.equal(strategyFor("update", true, undefined, "collectionType").action, "update")
  assert.equal(strategyFor("create", false, undefined, "collectionType").action, "create")
  assert.equal(strategyFor("create", true, undefined, "singleType").action, "update")
})

test("reuses media by checksum before name and size", () => {
  const match = matchMedia(
    { name: "hero.png", mime: "image/png", size: 1.5, sha256: "abc", hash: "other" },
    [
      { id: 2, name: "hero.png", mime: "image/png", size: 1.5 },
      { id: 9, sha256: "abc", name: "different.png" },
    ]
  )
  assert.equal(match?.id, 9)
})

test("round-trips the logical structure with new media ids and relation document ids", () => {
  const serialized = serialize()
  const mediaIds = new Map<string, number>([
    ["hash-share.png", 30],
    ["hash-hero.png", 31],
    ["hash-one.png", 32],
    ["hash-two.png", 33],
    ["hash-icon.png", 34],
    ["hash-tab.png", 35],
    ["hash-a.png", 36],
  ])
  const restored = deserializeAttributes(serialized, model, {
    relationMode: "resolve",
    path: [],
    model: (uid) => {
      const nested = source.getModel(uid)
      if (!nested) {
        throw new Error(uid)
      }
      return nested
    },
    resolveMedia: (media) => mediaIds.get(media.hash ?? "") ?? null,
    resolveRelation: (relation) => (relation.documentId === "article-1" ? "dest-article" : null),
  })
  const sections = restored.sections as Array<Record<string, unknown>>
  assert.deepEqual(
    sections.map((section) => section.__component),
    ["sections.hero", "sections.features", "sections.tabbed-showcase", "sections.explore-card", "sections.value-section"]
  )
  assert.equal((sections[0].image as number), 31)
  assert.deepEqual(sections[0].gallery, [32, 33])
  assert.equal(((sections[0].cta as { label: string }).label), "Contact")
  const panel = (sections[2].tabs as Array<{ panel: { body: Array<{ type: string }> } }>)[0].panel
  assert.equal(panel.body[0].type, "paragraph")
  const blocks = (sections[4].blocks as Array<Record<string, unknown>>)
  assert.equal(blocks[0].__component, "sections.block-a")
  assert.equal(blocks[1].__component, "sections.block-b")
  assert.deepEqual(restored.relatedArticles, { set: [{ documentId: "dest-article" }] })
  assert.equal((restored.metadata as { theme: string }).theme, "blue")
})

test("draft mode does not publish and preserve mode publishes modified content", () => {
  const data = { title: "Draft" }
  const published = { title: "Live" }
  assert.deepEqual(planPublication({ locale: "en", publicationState: "published", draft: { data }, published: { data: published } }, "draft", true), {
    data,
    publish: false,
    unpublish: false,
  })
  const modified = planPublication(
    { locale: "en", publicationState: "modified", draft: { data }, published: { data: published } },
    "preserve",
    true
  )
  assert.equal(modified.publish, true)
  assert.deepEqual(modified.draftAfterPublish, data)
  assert.equal(modified.data.title, "Live")
})

test("imports base documents before relations and rolls back when a relation is missing", async () => {
  const calls: string[] = []
  const created: string[] = []
  const ports = {
    async findByDocumentId() {
      return null
    },
    async findByField() {
      return null
    },
    async findSingle() {
      return null
    },
    async create(input: { uid: string; data: Record<string, unknown> }) {
      calls.push(`create:${input.uid}:${"relatedArticles" in input.data}`)
      created.push("page-1")
      return { documentId: "page-1" }
    },
    async update(input: { data: Record<string, unknown> }) {
      calls.push(`update:${"relatedArticles" in input.data}`)
      if (input.data.relatedArticles) {
        throw new Error("Unable to resolve relation.\nReferenced type: api::article.article\ndocumentId: article-1")
      }
    },
    async publish() {
      calls.push("publish")
    },
    async unpublish() {
      calls.push("unpublish")
    },
    async delete(input: { documentId: string }) {
      calls.push(`delete:${input.documentId}`)
    },
    async readSnapshot() {
      return null
    },
    async findMediaId() {
      return null
    },
  }
  const result = await executeImport(
    [documentFrom()],
    source,
    { conflictStrategy: "create", publishMode: "draft", unresolvedRelations: "error" },
    ports,
    new Map()
  )
  assert.equal(calls[0].startsWith("create:"), true)
  assert.equal(calls.includes("publish"), false)
  assert.equal(calls.includes("delete:page-1"), true)
  assert.equal(result.rollback.attempted, true)
  assert.equal(result.rollback.completed, true)
  assert.match(result.issues.map((issue) => issue.message).join("\n"), /Unable to resolve relation/)
  assert.match(result.issues.map((issue) => issue.message).join("\n"), /article-1/)
})
