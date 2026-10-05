const config = {
  default: {
    maxArchiveBytes: 200 * 1024 * 1024,
    maxRecursionDepth: 32,
    batchSize: 25,
    concurrency: 3,
    defaultConflictStrategy: "skip",
    unresolvedRelations: "error",
    storageDir: "",
  },
  validator(config: Record<string, unknown>) {
    const depth = Number(config.maxRecursionDepth)
    const bytes = Number(config.maxArchiveBytes)
    const batch = Number(config.batchSize)
    if (!Number.isFinite(depth) || depth < 1 || depth > 100) {
      throw new Error("maxRecursionDepth must be between 1 and 100")
    }
    if (!Number.isFinite(bytes) || bytes < 1024) {
      throw new Error("maxArchiveBytes must be at least 1024")
    }
    if (!Number.isFinite(batch) || batch < 1 || batch > 200) {
      throw new Error("batchSize must be between 1 and 200")
    }
    const strategy = config.defaultConflictStrategy
    if (strategy && !["skip", "update", "create", "ask"].includes(String(strategy))) {
      throw new Error("defaultConflictStrategy is invalid")
    }
  },
}

export default config
