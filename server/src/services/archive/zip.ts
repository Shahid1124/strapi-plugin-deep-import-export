import { createReadStream, createWriteStream } from "node:fs"
import { stat } from "node:fs/promises"
import { crc32, inflateRaw } from "node:zlib"
import { pipeline } from "node:stream/promises"
import { ImportExportError } from "../utils/errors"

export interface ZipEntry {
  name: string
  data: Buffer
}

interface CentralEntry {
  name: string
  crc: number
  size: number
  offset: number
}

const LOCAL_SIGNATURE = 0x04034b50
const CENTRAL_SIGNATURE = 0x02014b50
const END_SIGNATURE = 0x06054b50
const UTF8_FLAG = 0x800

const dosTime = (date: Date): { time: number; day: number } => {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, day }
}

/**
 * Streaming STORE-method writer. Media and JSON are copied from disk instead of
 * being accumulated into one in-memory archive.
 */
export class ZipWriter {
  private readonly entries: CentralEntry[] = []
  private offset = 0
  private readonly stream: ReturnType<typeof createWriteStream>
  private closed = false

  constructor(filePath: string) {
    this.stream = createWriteStream(filePath)
  }

  async addBuffer(name: string, data: Buffer): Promise<void> {
    this.assertName(name)
    const checksum = crc32(data)
    await this.writeLocal(name, checksum, data.length, data)
  }

  async addFile(name: string, filePath: string): Promise<void> {
    this.assertName(name)
    const info = await stat(filePath)
    let checksum = 0
    await new Promise<void>((resolve, reject) => {
      const reader = createReadStream(filePath)
      reader.on("data", (chunk) => {
        checksum = crc32(chunk as Buffer, checksum)
      })
      reader.on("error", reject)
      reader.on("end", () => resolve())
    })
    const { time, day } = dosTime(new Date())
    const nameBuffer = Buffer.from(name, "utf8")
    const header = Buffer.alloc(30)
    header.writeUInt32LE(LOCAL_SIGNATURE, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(UTF8_FLAG, 6)
    header.writeUInt16LE(0, 8)
    header.writeUInt16LE(time, 10)
    header.writeUInt16LE(day, 12)
    header.writeUInt32LE(checksum >>> 0, 14)
    header.writeUInt32LE(info.size, 18)
    header.writeUInt32LE(info.size, 22)
    header.writeUInt16LE(nameBuffer.length, 26)
    header.writeUInt16LE(0, 28)
    const start = this.offset
    await this.write(header)
    await this.write(nameBuffer)
    await pipeline(createReadStream(filePath), this.stream, { end: false })
    this.offset += info.size
    this.entries.push({ name, crc: checksum >>> 0, size: info.size, offset: start })
  }

  async close(): Promise<void> {
    if (this.closed) {
      return
    }
    const centralStart = this.offset
    for (const entry of this.entries) {
      const nameBuffer = Buffer.from(entry.name, "utf8")
      const header = Buffer.alloc(46)
      header.writeUInt32LE(CENTRAL_SIGNATURE, 0)
      header.writeUInt16LE(20, 4)
      header.writeUInt16LE(20, 6)
      header.writeUInt16LE(UTF8_FLAG, 8)
      header.writeUInt16LE(0, 10)
      header.writeUInt16LE(0, 12)
      header.writeUInt16LE(0, 14)
      header.writeUInt32LE(entry.crc, 16)
      header.writeUInt32LE(entry.size, 20)
      header.writeUInt32LE(entry.size, 24)
      header.writeUInt16LE(nameBuffer.length, 28)
      header.writeUInt16LE(0, 30)
      header.writeUInt16LE(0, 32)
      header.writeUInt16LE(0, 34)
      header.writeUInt16LE(0, 36)
      header.writeUInt32LE(0, 38)
      header.writeUInt32LE(entry.offset, 42)
      await this.write(header)
      await this.write(nameBuffer)
    }
    const centralSize = this.offset - centralStart
    const end = Buffer.alloc(22)
    end.writeUInt32LE(END_SIGNATURE, 0)
    end.writeUInt16LE(0, 4)
    end.writeUInt16LE(0, 6)
    end.writeUInt16LE(this.entries.length, 8)
    end.writeUInt16LE(this.entries.length, 10)
    end.writeUInt32LE(centralSize, 12)
    end.writeUInt32LE(centralStart, 16)
    end.writeUInt16LE(0, 20)
    await this.write(end)
    await new Promise<void>((resolve, reject) => {
      this.stream.end(() => resolve())
      this.stream.on("error", reject)
    })
    this.closed = true
  }

  private async writeLocal(name: string, checksum: number, size: number, data: Buffer): Promise<void> {
    const { time, day } = dosTime(new Date())
    const nameBuffer = Buffer.from(name, "utf8")
    const header = Buffer.alloc(30)
    header.writeUInt32LE(LOCAL_SIGNATURE, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(UTF8_FLAG, 6)
    header.writeUInt16LE(0, 8)
    header.writeUInt16LE(time, 10)
    header.writeUInt16LE(day, 12)
    header.writeUInt32LE(checksum >>> 0, 14)
    header.writeUInt32LE(size, 18)
    header.writeUInt32LE(size, 22)
    header.writeUInt16LE(nameBuffer.length, 26)
    header.writeUInt16LE(0, 28)
    const start = this.offset
    await this.write(Buffer.concat([header, nameBuffer, data]))
    this.entries.push({ name, crc: checksum >>> 0, size, offset: start })
  }

  private write(chunk: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stream.write(chunk, (error) => {
        if (error) {
          reject(error)
          return
        }
        this.offset += chunk.length
        resolve()
      })
    })
  }

  private assertName(name: string): void {
    assertSafeEntryName(name)
  }
}

export const assertSafeEntryName = (name: string): string => {
  const normalized = name.replace(/\\/g, "/")
  if (!normalized || normalized.startsWith("/") || normalized.includes("\0")) {
    throw new ImportExportError(`Archive entry "${name}" is not allowed.`, "UNSAFE_PATH", { name })
  }
  const parts = normalized.split("/")
  if (parts.some((part) => part === ".." || part === ".")) {
    throw new ImportExportError(`Archive entry "${name}" escapes the package root.`, "PATH_TRAVERSAL", { name })
  }
  const allowed =
    normalized === "manifest.json" ||
    normalized === "data.json" ||
    normalized === "schemas.json" ||
    normalized === "README.md" ||
    (normalized.startsWith("media/") && parts.length === 2 && parts[1].length > 0)
  if (!allowed) {
    throw new ImportExportError(`Archive entry "${name}" is not part of the export format.`, "UNEXPECTED_ENTRY", { name })
  }
  return normalized
}

export const sanitizeFileName = (value: string): string => {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "")
  return cleaned.slice(0, 80) || "file"
}

export const readZip = async (filePath: string, maxBytes: number): Promise<ZipEntry[]> => {
  const info = await stat(filePath)
  if (info.size > maxBytes) {
    throw new ImportExportError(`Archive is larger than the ${maxBytes} byte limit.`, "ARCHIVE_TOO_LARGE", {
      size: info.size,
      maxBytes,
    })
  }
  const { readFile } = await import("node:fs/promises")
  const buffer = await readFile(filePath)
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== LOCAL_SIGNATURE) {
    throw new ImportExportError("Uploaded file is not a ZIP archive.", "INVALID_ARCHIVE")
  }
  const entries: ZipEntry[] = []
  let offset = 0
  let uncompressed = 0
  while (offset + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset)
    if (signature === CENTRAL_SIGNATURE || signature === END_SIGNATURE) {
      break
    }
    if (signature !== LOCAL_SIGNATURE) {
      throw new ImportExportError("The archive contains an unsupported ZIP structure.", "INVALID_ARCHIVE")
    }
    const flags = buffer.readUInt16LE(offset + 6)
    const method = buffer.readUInt16LE(offset + 8)
    const compressedSize = buffer.readUInt32LE(offset + 18)
    const uncompressedSize = buffer.readUInt32LE(offset + 22)
    const nameLength = buffer.readUInt16LE(offset + 26)
    const extraLength = buffer.readUInt16LE(offset + 28)
    const nameStart = offset + 30
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8")
    const dataStart = nameStart + nameLength + extraLength
    if (flags & 0x1) {
      throw new ImportExportError("Encrypted archives are not supported.", "ENCRYPTED_ARCHIVE", { name })
    }
    if (flags & 0x8 || compressedSize === 0xffffffff) {
      throw new ImportExportError("ZIP data descriptors are not supported. Re-export the package with this plugin.", "UNSUPPORTED_ZIP", { name })
    }
    const safeName = assertSafeEntryName(name)
    const slice = buffer.subarray(dataStart, dataStart + compressedSize)
    let data: Buffer
    if (method === 0) {
      data = Buffer.from(slice)
    } else if (method === 8) {
      if (uncompressedSize > maxBytes) {
        throw new ImportExportError("Archive entry expands beyond the size limit.", "ZIP_BOMB", { name })
      }
      data = inflateRaw(slice)
    } else {
      throw new ImportExportError(`Unsupported ZIP compression method ${method}.`, "UNSUPPORTED_ZIP", { name, method })
    }
    if (uncompressedSize !== 0 && data.length !== uncompressedSize) {
      throw new ImportExportError(`Archive entry "${safeName}" failed a size check.`, "CORRUPT_ENTRY", { name: safeName })
    }
    uncompressed += data.length
    if (uncompressed > maxBytes) {
      throw new ImportExportError("Uncompressed archive exceeds the size limit.", "ZIP_BOMB")
    }
    entries.push({ name: safeName, data })
    offset = dataStart + compressedSize
    if (entries.length > 10000) {
      throw new ImportExportError("Archive contains too many files.", "TOO_MANY_FILES")
    }
  }
  return entries
}
