import type { MediaRef } from "../serializer/types"

export interface StoredMedia {
  id: number
  documentId?: string | null
  hash?: string | null
  name?: string | null
  mime?: string | null
  size?: number | null
  sizeInBytes?: number | null
  sha256?: string | null
}

const sameSize = (left: MediaRef, right: StoredMedia): boolean => {
  if (typeof left.sizeInBytes === "number" && typeof right.sizeInBytes === "number") {
    return left.sizeInBytes === right.sizeInBytes
  }
  if (typeof left.size === "number" && typeof right.size === "number") {
    return Math.abs(left.size - right.size) < 0.01
  }
  return false
}

/**
 * Prefer a content hash recorded by a previous import, then Strapi's file hash,
 * then name + mime + size. Numeric media ids are never treated as portable.
 */
export const matchMedia = (wanted: MediaRef, candidates: StoredMedia[]): StoredMedia | null => {
  if (wanted.sha256) {
    const bySha = candidates.find((candidate) => candidate.sha256 && candidate.sha256 === wanted.sha256)
    if (bySha) {
      return bySha
    }
  }
  if (wanted.hash) {
    const byHash = candidates.find((candidate) => candidate.hash && candidate.hash === wanted.hash)
    if (byHash) {
      return byHash
    }
  }
  return (
    candidates.find((candidate) => {
      return candidate.name === wanted.name && candidate.mime === wanted.mime && sameSize(wanted, candidate)
    }) ?? null
  )
}
