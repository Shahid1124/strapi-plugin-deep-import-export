# Deep Import / Export

Schema-driven import and export for Strapi 5. The plugin reads content-type and component schemas at runtime, so it works in any Strapi 5 project that already has those schemas. It does not create content types, and it does not special-case any one project's structure.

It uses the Document Service API, not GraphQL. Existing GraphQL queries keep working because the plugin does not change their schemas or resolvers.

## Requirements

- Strapi 5
- Node.js 18 or newer

## Installation

```bash
npm install strapi-plugin-deep-import-export
```

```bash
yarn add strapi-plugin-deep-import-export
```

Enable the plugin in `config/plugins.ts`. In a JavaScript project, add the same key to `config/plugins.js`. Leave out `resolve`. Strapi loads `strapi-plugin-deep-import-export` from `node_modules`.

```ts
export default () => ({
  "deep-import-export": {
    enabled: true,
  },
})
```

Optional settings:

```ts
"deep-import-export": {
  enabled: true,
  config: {
    maxArchiveBytes: 200 * 1024 * 1024,
    maxRecursionDepth: 32,
    batchSize: 25,
    defaultConflictStrategy: "skip",
    unresolvedRelations: "error",
  },
}
```

Restart Strapi. For a production admin build, run `npm run build` or `yarn build` in the Strapi project so the admin panel includes the plugin. The first boot creates two hidden content types, `job` and `media-fingerprint`. They do not appear in the Content Manager.

Grant **Access Import / Export**, **Export content**, and **Import content** under Settings → Roles → Plugins. Super Admin already has every permission.

Open **Import / Export** in the admin menu.

### Large uploads

The plugin rejects archives larger than `maxArchiveBytes` (200 MB by default). If a reverse proxy or Strapi's body parser rejects the upload first, raise the body limit in `config/middlewares.ts` for `strapi::body`:

```ts
{
  name: "strapi::body",
  config: {
    formLimit: "256mb",
    jsonLimit: "256mb",
    textLimit: "256mb",
    formidable: { maxFileSize: 200 * 1024 * 1024 },
  },
}
```

## Configuration

| Option | Default | Purpose |
| --- | --- | --- |
| `maxArchiveBytes` | 209715200 | Maximum ZIP size and uncompressed size |
| `maxRecursionDepth` | 32 | Guard against cyclic component graphs |
| `batchSize` | 25 | Documents loaded per database page |
| `defaultConflictStrategy` | `skip` | Used when the request does not choose one |
| `unresolvedRelations` | `error` | `error` stops the import; `warn` continues |
| `storageDir` | `.tmp/deep-import-export` | Where archives and pending uploads are stored |

No API keys, database credentials, or environment variables are written into an export.

## Export

1. Open **Import / Export → Export**.
2. Choose a content type. Collection types can export every entry or a selected set. Single types export their one document.
3. Choose draft, published, or both.
4. Choose whether to include media files and relations.
5. Optional filters use Strapi's filter JSON, for example `{ "slug": { "$eq": "about-us" } }`.
6. The file name follows the content type, or the selected entry when only one is exported. Type a custom name in **File name** to override it. Download the ZIP when the job completes.

Exports are paginated. Relations are stored as references, not as nested copies of the related document, so a cycle such as Page → Article → Page cannot recurse forever.

## Import

1. Upload the ZIP.
2. **Validate** runs a dry run. Nothing is written.
3. Review the preview: content types, entries, components, dynamic zone items, relations, media, warnings, and errors.
4. Choose a conflict strategy and a draft/publish mode.
5. Import. The job reports created, updated, skipped, failed, and whether rollback completed.

Validation errors block the import. Warnings do not.

## Export format

```text
strapi-export-YYYY-MM-DDTHH-mm-ss.zip
├── manifest.json
├── data.json
├── schemas.json
├── README.md
└── media/
    ├── 0001-logo.webp
    └── 0002-hero.png
```

`formatVersion` is `1.0.0`. Packages from another major format, or from Strapi 4, are rejected.

### manifest.json

```json
{
  "formatVersion": "1.0.0",
  "strapiVersion": "5.28.0",
  "strapiMajorVersion": 5,
  "strapiMinorVersion": 28,
  "exportedAt": "2026-10-05T12:00:00.000Z",
  "sourceEnvironment": "development",
  "locales": ["en", "fr"],
  "contentTypes": ["api::website-page.website-page"],
  "components": ["shared.seo", "sections.hero"],
  "mediaCount": 2,
  "relationCount": 3,
  "entryCount": 1,
  "componentCount": 8,
  "dynamicZoneCount": 5,
  "includeMedia": true,
  "includeRelations": true,
  "plugin": "deep-import-export"
}
```

### data.json

Documents are a JSON array streamed to disk. Each document keeps every locale, and each locale keeps draft and published versions when they differ.

```json
{
  "documents": [
    {
      "uid": "api::website-page.website-page",
      "kind": "collectionType",
      "documentId": "page-1",
      "identity": { "slug": "about-us" },
      "locales": [
        {
          "locale": "en",
          "publicationState": "modified",
          "draft": { "data": { "title": "About draft" } },
          "published": { "data": { "title": "About Us" } }
        }
      ]
    }
  ]
}
```

### Dynamic zones

Dynamic zones stay ordered arrays. Each item keeps `__component`, and the importer loads that component's schema before writing it. A dynamic zone inside a component is handled by the same recursion.

```json
{
  "sections": [
    { "__component": "sections.hero", "title": "Welcome" },
    {
      "__component": "sections.value-section",
      "blocks": [
        { "__component": "sections.block-a", "title": "A" },
        { "__component": "sections.block-b", "text": "Plain" }
      ]
    }
  ]
}
```

### Relations

Relations are not numeric ids.

```json
{
  "$ref": {
    "uid": "api::article.article",
    "documentId": "article-1",
    "locale": "en",
    "identity": { "slug": "story" }
  }
}
```

The owning side of the relation is written. The inverse side (`mappedBy`) is skipped so Strapi does not create the link twice. Morph relations are not transferred.

If a reference cannot be found, the error names the content type, field path, and `documentId`.

### Media

```json
{
  "$media": {
    "key": "media/0001-hero.png",
    "sha256": "...",
    "name": "hero.png",
    "hash": "...",
    "mime": "image/png",
    "size": 12.4,
    "sizeInBytes": 12698,
    "width": 1200,
    "height": 800,
    "alternativeText": "Hero"
  }
}
```

On import the plugin reuses a library file when a previous import recorded the same SHA-256, then when Strapi's file hash matches, then when name, mime, and size match. Otherwise it uploads the bytes from `media/`.

### schemas.json

A public snapshot of the exported content types, nested components, dynamic zone allow-lists, relations, and media fields. Collection names, secrets, and private fields are omitted. The destination schema is what the importer writes against. Extra source fields become warnings and are dropped.

### Other field types

Strings, text, rich text, blocks, JSON, integers, big integers, floats, decimals, booleans, dates, times, datetimes, enumerations, UIDs, and emails are copied as stored. Blocks and JSON are not flattened. Custom fields are copied as their underlying JSON value. Password and private attributes are omitted.

## Conflict resolution

Matching order:

1. An explicit id map, when one was supplied.
2. `documentId`.
3. Unique fields other than slug.
4. Slug or UID.
5. Otherwise the document is created.

Single types always match the existing singleton. "Create new" cannot duplicate a single type; it updates that entry and records a warning.

| Strategy | Existing document | Missing document |
| --- | --- | --- |
| Skip existing | Leave it unchanged | Create it |
| Update existing | Replace the imported fields | Create it |
| Create new | Create another document when unique fields allow it | Create it |
| Ask / preview | Require a per-entry decision before import | Create it |

Unique collisions, such as a second `about-us` slug, fail that entry with a validation error. The plugin does not rename slugs silently.

## Draft and publish

| Mode | Result |
| --- | --- |
| Preserve source status | Published source content is published. A different draft is written afterwards. Draft-only source content is stored as a draft and unpublished. |
| Import as draft | Writes the draft version and leaves an existing published version in place. |
| Import and publish | Writes the published version and publishes it. |

Content types without draft and publish receive one write and are never published or unpublished.

## Localization

Localized content types export each locale on the same `documentId`. The default locale is written first because Strapi requires it before other locales. A locale filter and a locale map can be sent in the import options (`locales`, `localeMap`). The importer does not write a locale onto a content type that is not localized; it keeps the first locale and warns. It does not create new locales in the i18n settings.

## Import phases

1. Validate the package against the destination schema.
2. Match existing documents and build the preview.
3. Reuse or upload media.
4. Create or update documents without relations, including components and dynamic zones.
5. Resolve relations, including relations inside components and dynamic zones, and write them with `set`.
6. Publish, unpublish, or keep a modified draft, according to the selected mode.

Relations inside the same package are linked after every document exists, including circular references.

## Rollback

Strapi opens its own database transaction for each document create or update. A multi-document import cannot be wrapped in one transaction that also covers Azure media uploads.

If a later step throws, the plugin compensates:

- documents created during the import are deleted
- documents updated during the import are restored from a snapshot taken before the update
- media files uploaded during the import are removed through the upload plugin

The job reports **Rollback: Completed** only when every compensating action succeeded. If one of them fails, the job says the rollback is incomplete and lists the failures. A process crash in the middle of an import does not run compensation.

## History and progress

Jobs are stored in the hidden `job` content type. The admin polls `GET /deep-import-export/status/:id` and shows progress for content types, entries, components, media, and relations. History shows operation, status, counts, and duration. Delete removes one finished job and its archive from disk. Clear finished removes every completed or failed job and those files. A job that is still queued or running cannot be deleted. Archive paths and file bytes are not returned in the history payload.

## Security

- Admin authentication is required.
- Export, import, and read are separate permissions.
- Only `.zip` uploads are accepted, and the file must start with a ZIP signature.
- Archive entry names must be `manifest.json`, `data.json`, `schemas.json`, `README.md`, or `media/<file>`.
- `..`, absolute paths, and nested media folders are rejected.
- Filenames are sanitized. Imported files are passed to Strapi's upload service and are not executed.
- The archive size and the uncompressed size are capped.
- Secrets and environment configuration are not part of the format.

## API

All routes are admin routes mounted at `/deep-import-export`.

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/content-types` | read |
| GET | `/entries` | read |
| POST | `/export` | export |
| POST | `/import/validate` | import |
| POST | `/import` | import |
| GET | `/history` | read |
| DELETE | `/history` | read |
| DELETE | `/jobs/:id` | read |
| GET | `/status/:id` | read |
| GET | `/jobs/:id/download` | export |

## Tests

From this repository:

```bash
npm test
```

The tests cover scalars, nested components, dynamic zone order, nested dynamic zones, relations, circular relations, media, draft/publish planning, locale separation, schema errors, version rejection, identity matching, conflict strategies, media reuse, and rollback when a relation cannot be resolved. They use an in-memory schema shaped like a page with SEO, a hero, repeatable features, tabs, an explore relation, and a value section that contains another dynamic zone. Those names exist only in the test fixture.

## Troubleshooting

**The menu item is missing.** The role needs the Access Import / Export permission. Restart Strapi after enabling the plugin.

**Import is blocked: incompatible Strapi version.** The package was exported from Strapi 4, or `formatVersion` is not 1.x. Export it again from Strapi 5.

**Unable to resolve relation.** The referenced `documentId` is not in the package and not in the destination. Include the related content type in the export, or change unresolved relations to "Warn and continue".

**A required field warning appears.** The destination schema requires a field the package does not contain. Publishing may still be rejected by Strapi. Fix the source content or import as draft.

**Media was not attached.** The archive was exported without files, and no library file matched the hash, name, and size. Export again with media included.

**Unique slug error.** Another entry already uses that slug and the strategy is Create new. Choose Update or Skip.

## Known limitations

- Polymorphic relations are skipped.
- Users, permissions, API tokens, and plugin configuration are not exported.
- The destination must already contain the content types and components. The plugin does not create schemas.
- Locales must already exist in i18n settings.
- Rollback is compensating, not one database transaction, and it does not run if the process is killed.
- Very large single documents are still parsed one document at a time, but the full document set stays in memory during import so relations across the package can be resolved.
- An example of the JSON shape is in `examples/sample-package`.
