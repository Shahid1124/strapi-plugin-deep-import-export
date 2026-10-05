const auth = (action: "read" | "export" | "import") => ({
  policies: [
    "plugin::deep-import-export.is-authenticated-admin",
    "admin::isAuthenticatedAdmin",
    {
      name: "admin::hasPermissions",
      config: {
        actions: [`plugin::deep-import-export.${action}`],
      },
    },
  ],
})

const routes = {
  admin: {
    type: "admin",
    routes: [
      { method: "GET", path: "/content-types", handler: "transfer.contentTypes", config: auth("read") },
      { method: "GET", path: "/entries", handler: "transfer.entries", config: auth("read") },
      { method: "POST", path: "/export", handler: "transfer.exportStart", config: auth("export") },
      { method: "POST", path: "/import/validate", handler: "transfer.validate", config: auth("import") },
      { method: "POST", path: "/import", handler: "transfer.importStart", config: auth("import") },
      { method: "GET", path: "/history", handler: "transfer.history", config: auth("read") },
      { method: "GET", path: "/status/:id", handler: "transfer.status", config: auth("read") },
      { method: "GET", path: "/jobs/:id/download", handler: "transfer.download", config: auth("export") },
    ],
  },
}

export default routes
