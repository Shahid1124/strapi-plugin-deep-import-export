import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { test } from "node:test"
import { DocumentJsonWriter, readDocumentArray } from "./json-stream"
import { assertSafeEntryName, readZip, ZipWriter } from "./zip"
import { ImportExportError } from "../utils/errors"

test("rejects path traversal and unexpected archive entries", () => {
  for (const name of ["../secret.txt", "media/../../etc/passwd", "/tmp/file", "notes/extra.txt", "media/nested/file.png"]) {
    assert.throws(() => assertSafeEntryName(name), ImportExportError)
  }
  assert.equal(assertSafeEntryName("media/0001-logo.png"), "media/0001-logo.png")
})

test("round-trips a package through the zip writer and reader", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "deep-export-"))
  const dataPath = path.join(directory, "data.json")
  const writer = new DocumentJsonWriter(dataPath)
  await writer.writeDocument({ documentId: "page-1", title: "About {us}" })
  await writer.writeDocument({ documentId: "page-2", title: "Next" })
  await writer.close()
  const documents: Array<{ documentId: string }> = []
  await readDocumentArray(dataPath, (document) => {
    documents.push(document as { documentId: string })
  })
  assert.deepEqual(documents.map((document) => document.documentId), ["page-1", "page-2"])

  const zipPath = path.join(directory, "package.zip")
  const zip = new ZipWriter(zipPath)
  await zip.addBuffer("manifest.json", Buffer.from(JSON.stringify({ formatVersion: "1.0.0" })))
  await zip.addFile("data.json", dataPath)
  await zip.addBuffer("schemas.json", Buffer.from("{}"))
  await zip.addBuffer("README.md", Buffer.from("readme"))
  await writeFile(path.join(directory, "logo.png"), Buffer.from("image-bytes"))
  await zip.addFile("media/0001-logo.png", path.join(directory, "logo.png"))
  await zip.close()

  const entries = await readZip(zipPath, 5_000_000)
  const names = entries.map((entry) => entry.name)
  assert.deepEqual(names, ["manifest.json", "data.json", "schemas.json", "README.md", "media/0001-logo.png"])
  assert.equal((await readFile(dataPath)).equals(entries[1].data), true)
  assert.equal(entries[4].data.toString(), "image-bytes")
})

test("rejects a non-zip upload", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "deep-export-bad-"))
  const filePath = path.join(directory, "nope.zip")
  await writeFile(filePath, Buffer.from("not a zip"))
  await assert.rejects(readZip(filePath, 1000), (error: unknown) => {
    assert.ok(error instanceof ImportExportError)
    assert.equal(error.code, "INVALID_ARCHIVE")
    return true
  })
})
