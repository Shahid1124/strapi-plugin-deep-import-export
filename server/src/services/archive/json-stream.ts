import { createReadStream, createWriteStream } from "node:fs"
import { once } from "node:events"
import { ImportExportError } from "../utils/errors"

/**
 * Writes `{"documents":[...]}` without holding every document in memory.
 */
export class DocumentJsonWriter {
  private readonly stream: ReturnType<typeof createWriteStream>
  private started = false

  constructor(filePath: string) {
    this.stream = createWriteStream(filePath)
  }

  async writeDocument(document: unknown): Promise<void> {
    const prefix = this.started ? "," : '{"documents":['
    this.started = true
    const payload = prefix + JSON.stringify(document)
    if (!this.stream.write(payload)) {
      await once(this.stream, "drain")
    }
  }

  async close(): Promise<void> {
    const ending = this.started ? "]}" : '{"documents":[]}'
    this.stream.end(ending)
    await once(this.stream, "finish")
  }
}

/**
 * Reads the documents array one object at a time. String contents are tracked
 * so braces inside rich text or JSON fields do not break the split.
 */
export const readDocumentArray = async (filePath: string, onDocument: (document: unknown) => Promise<void> | void): Promise<void> => {
  const stream = createReadStream(filePath, { encoding: "utf8" })
  let capturing = false
  let depth = 0
  let inString = false
  let escaped = false
  let buffer = ""
  let seenArray = false
  let prefix = ""

  for await (const chunk of stream) {
    const text = String(chunk)
    if (!seenArray) {
      prefix += text
      const marker = prefix.indexOf("[")
      if (marker === -1) {
        if (prefix.length > 1000000) {
          throw new ImportExportError("data.json does not contain a documents array.", "MALFORMED_DATA")
        }
        continue
      }
      seenArray = true
      await consume(prefix.slice(marker + 1))
      prefix = ""
      continue
    }
    await consume(text)
  }

  if (!seenArray) {
    throw new ImportExportError("data.json does not contain a documents array.", "MALFORMED_DATA")
  }

  async function consume(text: string): Promise<void> {
    for (const char of text) {
      if (!capturing) {
        if (char === "{") {
          capturing = true
          depth = 1
          inString = false
          escaped = false
          buffer = "{"
        } else if (char === "]") {
          return
        }
        continue
      }
      buffer += char
      if (inString) {
        if (escaped) {
          escaped = false
        } else if (char === "\\") {
          escaped = true
        } else if (char === '"') {
          inString = false
        }
        continue
      }
      if (char === '"') {
        inString = true
        continue
      }
      if (char === "{") {
        depth += 1
      } else if (char === "}") {
        depth -= 1
        if (depth === 0) {
          try {
            await onDocument(JSON.parse(buffer))
          } catch (error) {
            throw new ImportExportError("data.json contains a document that is not valid JSON.", "MALFORMED_DATA", {
              cause: error instanceof Error ? error.message : "parse error",
            })
          }
          capturing = false
          buffer = ""
        }
      }
    }
  }
}
