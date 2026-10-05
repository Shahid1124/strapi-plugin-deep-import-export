import assert from "node:assert/strict"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { test } from "node:test"
import { readDocumentArray } from "../archive/json-stream"
import { readZip } from "../archive/zip"
import { runExport } from "./run"
import { fixtureSource, pageEntry } from "../../testing/fixture"

test("exports locales separately and keeps draft changes distinct from published content", async () => {
  const source = fixtureSource()
  const english = pageEntry()
  const french = pageEntry()
  french.documentId = english.documentId
  french.locale = "fr"
  french.title = "A propos"
  french.slug = "a-propos"
  const directory = await mkdtemp(path.join(tmpdir(), "deep-locale-"))
  const { manifest, filePath } = await runExport(
    {
      contentTypes: ["api::website-page.website-page"],
      includeMedia: false,
      includeRelations: true,
      status: "both",
    },
    directory,
    {
      source,
      strapiVersion: "5.28.0",
      environment: "test",
      maxDepth: 12,
      batchSize: 10,
      listLocales: async () => ({ codes: ["en", "fr"], defaultLocale: "en" }),
      findPage: async ({ status, locale }) => {
        if (locale === "en" && status === "published") {
          return [english]
        }
        if (locale === "en" && status === "draft") {
          return [{ ...english, title: "About draft" }]
        }
        if (locale === "fr" && status === "draft") {
          return [french]
        }
        return []
      },
      readMedia: async () => Buffer.from("file"),
      onProgress() {},
    }
  )
  const entries = await readZip(filePath, 5_000_000)
  const data = entries.find((entry) => entry.name === "data.json")
  assert.ok(data)
  const dataPath = path.join(directory, "parsed.json")
  await writeFile(dataPath, data.data)
  const documents: Array<{ locales: Array<{ locale: string; publicationState: string; draft: { data: { title: string } } | null; published: { data: { title: string } } | null }> }> = []
  await readDocumentArray(dataPath, (document) => {
    documents.push(document as (typeof documents)[number])
  })
  assert.equal(documents.length, 1)
  assert.deepEqual(documents[0].locales.map((locale) => locale.locale), ["en", "fr"])
  const englishLocale = documents[0].locales[0]
  assert.equal(englishLocale.publicationState, "modified")
  assert.equal(englishLocale.published?.data.title, "About Us")
  assert.equal(englishLocale.draft?.data.title, "About draft")
  assert.equal(documents[0].locales[1].draft?.data.title, "A propos")
  assert.equal(documents[0].locales[1].published, null)
  assert.equal(manifest.strapiMajorVersion, 5)
  assert.equal(entries.some((entry) => entry.name === "schemas.json"), true)
  const schemas = JSON.parse(entries.find((entry) => entry.name === "schemas.json")!.data.toString())
  assert.equal(typeof schemas.contentTypes["api::website-page.website-page"], "object")
  assert.equal(schemas.contentTypes["api::website-page.website-page"].collectionName, undefined)
})
