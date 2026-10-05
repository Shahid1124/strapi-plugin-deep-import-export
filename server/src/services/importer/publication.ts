import type { ExportedLocale, PublishMode } from "../serializer/types"

export interface PublicationPlan {
  /** Payload written before publish/unpublish. */
  data: Record<string, unknown>
  /** Second payload used when a modified document must keep a different draft. */
  draftAfterPublish?: Record<string, unknown>
  publish: boolean
  unpublish: boolean
}

export const planPublication = (
  locale: ExportedLocale,
  mode: PublishMode,
  draftAndPublish: boolean
): PublicationPlan => {
  const draftData = locale.draft?.data ?? locale.published?.data ?? {}
  const publishedData = locale.published?.data ?? locale.draft?.data ?? {}
  if (!draftAndPublish) {
    return { data: publishedData, publish: false, unpublish: false }
  }
  if (mode === "draft") {
    return { data: draftData, publish: false, unpublish: false }
  }
  if (mode === "publish") {
    return { data: publishedData, publish: true, unpublish: false }
  }
  if (locale.publicationState === "draft") {
    return { data: draftData, publish: false, unpublish: true }
  }
  if (locale.publicationState === "modified" && locale.draft && locale.published) {
    return {
      data: publishedData,
      draftAfterPublish: locale.draft.data,
      publish: true,
      unpublish: false,
    }
  }
  return { data: publishedData, publish: true, unpublish: false }
}
