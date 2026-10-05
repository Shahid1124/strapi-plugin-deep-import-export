import * as esbuild from "esbuild"

const external = [
  "@strapi/strapi",
  "@strapi/design-system",
  "@strapi/icons",
  "react",
  "react-dom",
  "react-router-dom",
  "styled-components",
]

await esbuild.build({
  entryPoints: ["server/src/index.ts"],
  outfile: "dist/server/index.js",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  sourcemap: true,
  external,
})

await esbuild.build({
  entryPoints: ["server/src/index.ts"],
  outfile: "dist/server/index.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  sourcemap: true,
  external,
})

await esbuild.build({
  entryPoints: ["admin/src/index.ts"],
  outfile: "dist/admin/index.js",
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2020",
  jsx: "automatic",
  sourcemap: true,
  external,
})

await esbuild.build({
  entryPoints: ["admin/src/index.ts"],
  outfile: "dist/admin/index.mjs",
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2020",
  jsx: "automatic",
  sourcemap: true,
  external,
})
