import assert from "node:assert/strict"
import { test } from "node:test"
import { createSerializeContext, serializeAttributes } from "./serialize"
import { fixtureSource, pageEntry } from "../../testing/fixture"
import { ImportExportError } from "../utils/errors"

const source = fixtureSource()
const model = source.getModel("api::website-page.website-page")!

const serialize = (data: Record<string, unknown>, maxDepth = 32) => {
  const context = createSerializeContext(source, { includeRelations: true, maxDepth })
  return serializeAttributes(data, model, context)
}

test("preserves scalars, enum, boolean, number, date, json, rich text, and blocks", () => {
  const data = serialize(pageEntry())
  assert.equal(data.title, "About Us")
  assert.equal(data.slug, "about-us")
  assert.equal(data.showBreadcrumb, false)
  assert.equal(data.pageType, "landing")
  assert.equal(data.rank, 2)
  assert.equal(data.eventDate, "2026-10-05")
  assert.deepEqual(data.metadata, { theme: "blue", flags: [true, false] })
  assert.equal(data.body, "Hello **world**")
  assert.equal(Array.isArray(data.notes), true)
})

test("serializes nested and repeatable components without database ids", () => {
  const data = serialize(pageEntry())
  const seo = data.seo as { metaTitle: string; id?: number; structuredData: { "@type": string } }
  assert.equal(seo.metaTitle, "About")
  assert.equal(seo.id, undefined)
  assert.equal(seo.structuredData["@type"], "WebPage")
  const features = (data.sections as Array<Record<string, unknown>>)[1]
  const items = features.items as Array<{ title: string; id?: number }>
  assert.deepEqual(items.map((item) => item.title), ["Feature 1", "Feature 2"])
  assert.equal(items[0].id, undefined)
})

test("preserves dynamic zone order, component names, and nested dynamic zones", () => {
  const sections = serialize(pageEntry()).sections as Array<Record<string, unknown>>
  assert.deepEqual(
    sections.map((section) => section.__component),
    ["sections.hero", "sections.features", "sections.tabbed-showcase", "sections.explore-card", "sections.value-section"]
  )
  const value = sections[4]
  const blocks = value.blocks as Array<Record<string, unknown>>
  assert.deepEqual(
    blocks.map((block) => block.__component),
    ["sections.block-a", "sections.block-b"]
  )
  assert.equal(blocks[1].count, 4)
  assert.equal(blocks[1].text, "Plain")
})

test("exports relations as stable references and does not embed the target", () => {
  const data = serialize(pageEntry())
  assert.deepEqual(data.relatedArticles, [{ $ref: { uid: "api::article.article", documentId: "article-1", locale: "en", identity: { slug: "story" } } }])
  const explore = (data.sections as Array<Record<string, unknown>>)[3]
  assert.equal((explore.article as { $ref: { documentId: string } }).$ref.documentId, "article-1")
  assert.equal(JSON.stringify(data).includes("Story body"), false)
})

test("stops circular relations at the reference instead of walking the target", () => {
  const page = pageEntry()
  const article = {
    documentId: "article-1",
    title: "Story",
    slug: "story",
    pages: [page],
  }
  page.relatedArticles = [article]
  const data = serialize(page)
  const ref = (data.relatedArticles as Array<{ $ref: { documentId: string } }>)[0]
  assert.equal(ref.$ref.documentId, "article-1")
  assert.equal(JSON.stringify(ref).includes("sections.hero"), false)
})

test("exports single and multiple media, including media inside components and dynamic zones", () => {
  const data = serialize(pageEntry())
  const hero = (data.sections as Array<Record<string, unknown>>)[0]
  assert.equal((hero.image as { $media: { name: string } }).$media.name, "hero.png")
  assert.equal((hero.gallery as Array<{ $media: { name: string } }>).length, 2)
  const value = (data.sections as Array<Record<string, unknown>>)[4]
  const block = (value.blocks as Array<Record<string, unknown>>)[0]
  assert.equal((block.image as { $media: { hash: string } }).$media.hash, "hash-a.png")
})

test("refuses to recurse past the configured depth", () => {
  assert.throws(() => serialize(pageEntry(), 1), (error: unknown) => {
    assert.ok(error instanceof ImportExportError)
    assert.equal(error.code, "MAX_DEPTH")
    return true
  })
})

test("omits relations when includeRelations is false", () => {
  const context = createSerializeContext(source, { includeRelations: false, maxDepth: 8 })
  const data = serializeAttributes(pageEntry(), model, context)
  assert.equal(data.relatedArticles, undefined)
})
