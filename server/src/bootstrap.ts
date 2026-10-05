import { readdir, stat, rm } from "node:fs/promises"
import path from "node:path"
import { PLUGIN_ID } from "./services/utils/constants"
import { storageRoot, type AppStrapi } from "./services/strapi/runtime"

const bootstrap = async ({ strapi }: { strapi: AppStrapi }) => {
  const actions = [
    {
      section: "plugins",
      displayName: "Access Import / Export",
      uid: "read",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Export content",
      uid: "export",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Import content",
      uid: "import",
      pluginName: PLUGIN_ID,
    },
  ]
  const host = strapi as AppStrapi & {
    service?: (uid: string) => { actionProvider?: { registerMany?: (actions: unknown[]) => Promise<void> } }
  }
  const permission = host.service?.("admin::permission")
  if (permission?.actionProvider?.registerMany) {
    await permission.actionProvider.registerMany(actions)
  }

  const pending = path.join(storageRoot(strapi), "pending")
  try {
    const files = await readdir(pending)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const file of files) {
      const full = path.join(pending, file)
      const info = await stat(full)
      if (info.mtimeMs < cutoff) {
        await rm(full, { force: true })
      }
    }
  } catch {
    // The pending directory is created on the first upload.
  }
}

export default bootstrap
