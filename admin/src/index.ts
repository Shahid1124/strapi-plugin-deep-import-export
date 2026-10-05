import { Download } from "@strapi/icons"
import { PLUGIN_ID } from "./pluginId"

export default {
  register(app: {
    addMenuLink: (link: {
      to: string
      icon: typeof Download
      intlLabel: { id: string; defaultMessage: string }
      Component: () => Promise<{ default: unknown }>
      permissions: Array<{ action: string; subject: null }>
    }) => void
    registerPlugin: (plugin: { id: string; name: string }) => void
  }) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: Download,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Import / Export",
      },
      Component: () => import("./pages/App"),
      permissions: [{ action: `plugin::${PLUGIN_ID}.read`, subject: null }],
    })
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    })
  },
  bootstrap() {},
  async registerTrads({ locales }: { locales: string[] }) {
    return locales.map((locale) => ({ data: {}, locale }))
  },
}
