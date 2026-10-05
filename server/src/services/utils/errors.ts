export interface ErrorDetails {
  [key: string]: unknown
}

/**
 * Structured, user-facing failure. The Admin UI prints `message` and the
 * details object so editors can see which entry, field, and reference failed.
 */
export class ImportExportError extends Error {
  readonly code: string
  readonly details: ErrorDetails

  constructor(message: string, code: string, details: ErrorDetails = {}) {
    super(message)
    this.name = "ImportExportError"
    this.code = code
    this.details = details
  }
}

export interface StructuredIssue {
  level: "error" | "warning"
  code: string
  message: string
  details?: ErrorDetails
}

export const issue = (
  level: StructuredIssue["level"],
  code: string,
  message: string,
  details?: ErrorDetails
): StructuredIssue => ({ level, code, message, details })
