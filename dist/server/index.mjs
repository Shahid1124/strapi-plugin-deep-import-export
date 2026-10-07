var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/src/services/media/match.ts
var match_exports = {};
__export(match_exports, {
  matchMedia: () => matchMedia
});
var sameSize, matchMedia;
var init_match = __esm({
  "server/src/services/media/match.ts"() {
    sameSize = (left, right) => {
      if (typeof left.sizeInBytes === "number" && typeof right.sizeInBytes === "number") {
        return left.sizeInBytes === right.sizeInBytes;
      }
      if (typeof left.size === "number" && typeof right.size === "number") {
        return Math.abs(left.size - right.size) < 0.01;
      }
      return false;
    };
    matchMedia = (wanted, candidates) => {
      if (wanted.sha256) {
        const bySha = candidates.find((candidate) => candidate.sha256 && candidate.sha256 === wanted.sha256);
        if (bySha) {
          return bySha;
        }
      }
      if (wanted.hash) {
        const byHash = candidates.find((candidate) => candidate.hash && candidate.hash === wanted.hash);
        if (byHash) {
          return byHash;
        }
      }
      return candidates.find((candidate) => {
        return candidate.name === wanted.name && candidate.mime === wanted.mime && sameSize(wanted, candidate);
      }) ?? null;
    };
  }
});

// server/src/bootstrap.ts
import { readdir, stat, rm } from "node:fs/promises";
import path2 from "node:path";

// server/src/services/utils/constants.ts
var PLUGIN_ID = "deep-import-export";
var FORMAT_VERSION = "1.0.0";
var SUPPORTED_FORMAT_MAJOR = 1;
var SUPPORTED_STRAPI_MAJOR = 5;
var PACKAGE_FILES = {
  manifest: "manifest.json",
  data: "data.json",
  schemas: "schemas.json",
  readme: "README.md",
  mediaDir: "media/"
};
var BLOCKED_UID_PREFIXES = ["admin::", "plugin::"];
var SYSTEM_ATTRIBUTE_NAMES = /* @__PURE__ */ new Set([
  "id",
  "documentId",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "createdBy",
  "updatedBy",
  "locale",
  "localizations"
]);
var SCALAR_TYPES = /* @__PURE__ */ new Set([
  "string",
  "text",
  "richtext",
  "blocks",
  "json",
  "integer",
  "biginteger",
  "float",
  "decimal",
  "boolean",
  "date",
  "time",
  "datetime",
  "enumeration",
  "uid",
  "email",
  "password"
]);
var DEFAULT_CONFIG = {
  maxArchiveBytes: 200 * 1024 * 1024,
  maxRecursionDepth: 32,
  batchSize: 25,
  concurrency: 3,
  defaultConflictStrategy: "skip",
  unresolvedRelations: "error",
  storageDir: ""
};

// server/src/services/strapi/runtime.ts
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// server/src/services/schema/types.ts
var MemorySchemaSource = class {
  models = /* @__PURE__ */ new Map();
  constructor(models = []) {
    models.forEach((model) => this.models.set(model.uid, model));
  }
  add(model) {
    this.models.set(model.uid, model);
  }
  getModel(uid) {
    return this.models.get(uid);
  }
  contentTypes() {
    return [...this.models.values()].filter((model) => model.modelType === "contentType");
  }
  components() {
    return [...this.models.values()].filter((model) => model.modelType === "component");
  }
};

// server/src/services/schema/strapi-source.ts
var toModel = (model) => ({
  uid: model.uid,
  modelType: model.modelType ?? (model.uid.includes("::") ? "contentType" : "component"),
  kind: model.kind,
  displayName: model.info?.displayName,
  options: model.options,
  pluginOptions: model.pluginOptions,
  attributes: model.attributes ?? {}
});
var isBlockedUid = (uid) => BLOCKED_UID_PREFIXES.some((prefix) => uid.startsWith(prefix));
var schemaSourceFromStrapi = (strapi) => {
  const source = new MemorySchemaSource();
  const add = (model) => {
    if (!model?.uid) {
      return;
    }
    source.add(toModel(model));
  };
  Object.values(strapi.contentTypes).forEach(add);
  Object.values(strapi.components).forEach(add);
  return {
    getModel(uid) {
      return source.getModel(uid) ?? (() => {
        const model = strapi.getModel(uid);
        if (!model) {
          return void 0;
        }
        const mapped = toModel(model);
        source.add(mapped);
        return mapped;
      })();
    },
    contentTypes() {
      return source.contentTypes().filter((model) => !isBlockedUid(model.uid));
    },
    components() {
      return source.components();
    }
  };
};

// server/src/services/schema/attributes.ts
var isScalarAttribute = (attribute) => {
  if (attribute.type === "password") {
    return false;
  }
  return SCALAR_TYPES.has(attribute.type) || Boolean(attribute.customField);
};
var isOwningRelation = (attribute) => {
  return attribute.type === "relation" && !attribute.mappedBy && !isMorphRelation(attribute);
};
var isMorphRelation = (attribute) => {
  return attribute.type === "relation" && Boolean(attribute.relation?.toLowerCase().startsWith("morph"));
};
var isMultipleRelation = (attribute) => {
  return attribute.relation === "oneToMany" || attribute.relation === "manyToMany";
};
var isExportableAttribute = (name, attribute) => {
  if (SYSTEM_ATTRIBUTE_NAMES.has(name)) {
    return false;
  }
  if (attribute.private || attribute.type === "password") {
    return false;
  }
  if (name === "createdBy" || name === "updatedBy" || name === "localizations") {
    return false;
  }
  return true;
};
var identityFields = (model) => {
  const fields = [];
  for (const [name, attribute] of Object.entries(model.attributes)) {
    if (!isExportableAttribute(name, attribute) || !isScalarAttribute(attribute)) {
      continue;
    }
    if (attribute.unique || attribute.type === "uid" || name === "slug") {
      fields.push(name);
    }
  }
  return fields;
};
var labelFields = (model) => {
  const preferred = ["title", "name", "label", "slug", "pathname"];
  return preferred.filter((name) => {
    const attribute = model.attributes[name];
    return attribute ? isScalarAttribute(attribute) : false;
  });
};
var isLocalized = (model) => {
  return model.pluginOptions?.i18n?.localized === true;
};
var hasDraftAndPublish = (model) => {
  return model.options?.draftAndPublish === true;
};

// server/src/services/schema/populate.ts
var buildPopulate = (uid, source, maxDepth, depth = 0) => {
  if (depth > maxDepth) {
    return void 0;
  }
  const model = source.getModel(uid);
  if (!model) {
    return void 0;
  }
  const populate = {};
  for (const [name, attribute] of Object.entries(model.attributes)) {
    if (attribute.type === "media") {
      populate[name] = true;
      continue;
    }
    if (attribute.type === "relation") {
      if (isMorphRelation(attribute) || !attribute.target) {
        continue;
      }
      const target = source.getModel(attribute.target);
      const fields = ["documentId"];
      if (target) {
        for (const field of identityFields(target)) {
          if (!fields.includes(field)) {
            fields.push(field);
          }
        }
      }
      populate[name] = { fields };
      continue;
    }
    if (attribute.type === "component" && attribute.component) {
      const nested = buildPopulate(attribute.component, source, maxDepth, depth + 1);
      populate[name] = nested ? { populate: nested } : true;
      continue;
    }
    if (attribute.type === "dynamiczone") {
      const on = {};
      for (const componentUid of attribute.components ?? []) {
        const nested = buildPopulate(componentUid, source, maxDepth, depth + 1);
        on[componentUid] = nested ? { populate: nested } : true;
      }
      populate[name] = { on };
    }
  }
  return Object.keys(populate).length > 0 ? populate : void 0;
};

// server/src/services/utils/errors.ts
var ImportExportError = class extends Error {
  code;
  details;
  constructor(message, code, details = {}) {
    super(message);
    this.name = "ImportExportError";
    this.code = code;
    this.details = details;
  }
};
var issue = (level, code, message, details) => ({ level, code, message, details });

// server/src/services/serializer/types.ts
var emptyStats = () => ({
  mediaCount: 0,
  relationCount: 0,
  componentCount: 0,
  dynamicZoneCount: 0
});
var isMediaMarker = (value) => {
  return Boolean(value && typeof value === "object" && "$media" in value && value.$media?.name);
};
var isRelationMarker = (value) => {
  return Boolean(
    value && typeof value === "object" && "$ref" in value && typeof value.$ref?.uid === "string" && typeof value.$ref?.documentId === "string"
  );
};
var decisionKey = (uid, documentId) => `${uid}:${documentId}`;

// server/src/services/serializer/serialize.ts
var asRecord = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
};
var scalarIdentity = (model, value) => {
  if (!model) {
    return {};
  }
  const identity = {};
  for (const field of identityFields(model)) {
    const fieldValue = value[field];
    if (typeof fieldValue === "string" || typeof fieldValue === "number" || typeof fieldValue === "boolean") {
      identity[field] = fieldValue;
    }
  }
  return identity;
};
var toMediaRef = (value) => {
  const sizeInBytes = typeof value.sizeInBytes === "number" ? value.sizeInBytes : typeof value.size === "number" ? Math.round(value.size * 1024) : null;
  return {
    documentId: typeof value.documentId === "string" ? value.documentId : void 0,
    hash: typeof value.hash === "string" ? value.hash : void 0,
    name: typeof value.name === "string" ? value.name : "file",
    alternativeText: typeof value.alternativeText === "string" ? value.alternativeText : null,
    caption: typeof value.caption === "string" ? value.caption : null,
    mime: typeof value.mime === "string" ? value.mime : null,
    ext: typeof value.ext === "string" ? value.ext : null,
    size: typeof value.size === "number" ? value.size : null,
    sizeInBytes,
    width: typeof value.width === "number" ? value.width : null,
    height: typeof value.height === "number" ? value.height : null
  };
};
var toRelationRef = (value, attribute, source) => {
  const documentId = value.documentId;
  if (typeof documentId !== "string" || !attribute.target) {
    return null;
  }
  const target = source.getModel(attribute.target);
  return {
    uid: attribute.target,
    documentId,
    locale: typeof value.locale === "string" ? value.locale : null,
    identity: scalarIdentity(target, value)
  };
};
var createSerializeContext = (source, options) => ({
  source,
  options,
  stats: emptyStats(),
  depth: 0,
  seen: /* @__PURE__ */ new WeakSet(),
  path: []
});
var childContext = (ctx, segment, deepen) => ({
  ...ctx,
  depth: deepen ? ctx.depth + 1 : ctx.depth,
  path: [...ctx.path, segment]
});
var assertDepth = (ctx) => {
  if (ctx.depth > ctx.options.maxDepth) {
    throw new ImportExportError(
      `Recursion depth exceeded ${ctx.options.maxDepth} at ${ctx.path.join(".") || "root"}. Increase maxRecursionDepth if this structure is legitimate.`,
      "MAX_DEPTH",
      { path: ctx.path.join("."), maxDepth: ctx.options.maxDepth }
    );
  }
};
var serializeMediaValue = (value, multiple, ctx) => {
  const toMarker = (entry) => {
    const record = asRecord(entry);
    if (!record) {
      return null;
    }
    const ref = toMediaRef(record);
    ctx.onMedia?.(record, ref);
    ctx.stats.mediaCount += 1;
    return { $media: ref };
  };
  if (multiple) {
    return Array.isArray(value) ? value.map((entry) => toMarker(entry)).filter(Boolean) : [];
  }
  return toMarker(value);
};
var serializeRelationValue = (value, attribute, ctx) => {
  if (!ctx.options.includeRelations) {
    return void 0;
  }
  const toMarker = (entry) => {
    const record = asRecord(entry);
    if (!record) {
      return null;
    }
    const ref = toRelationRef(record, attribute, ctx.source);
    if (!ref) {
      return null;
    }
    ctx.stats.relationCount += 1;
    return { $ref: ref };
  };
  if (isMultipleRelation(attribute)) {
    return Array.isArray(value) ? value.map((entry) => toMarker(entry)).filter(Boolean) : [];
  }
  return toMarker(value);
};
var serializeComponentValue = (value, componentUid, repeatable, ctx) => {
  const model = ctx.source.getModel(componentUid);
  const serializeOne = (entry, index) => {
    const record = asRecord(entry);
    if (!record || !model) {
      return null;
    }
    if (ctx.seen.has(record)) {
      throw new ImportExportError(
        `Circular component structure detected at ${ctx.path.join(".")}`,
        "CIRCULAR_COMPONENT",
        { path: ctx.path.join("."), component: componentUid }
      );
    }
    ctx.seen.add(record);
    ctx.stats.componentCount += 1;
    const next = childContext(ctx, `${componentUid}[${index}]`, true);
    assertDepth(next);
    return serializeAttributes(record, model, next);
  };
  if (repeatable) {
    return Array.isArray(value) ? value.map((entry, index) => serializeOne(entry, index)).filter(Boolean) : [];
  }
  return serializeOne(value, 0);
};
var serializeDynamicZone = (value, attribute, ctx) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set(attribute.components ?? []);
  return value.map((entry, index) => {
    const record = asRecord(entry);
    const componentUid = typeof record?.__component === "string" ? record.__component : "";
    if (!record || !componentUid) {
      return null;
    }
    if (allowed.size > 0 && !allowed.has(componentUid)) {
      throw new ImportExportError(
        `Dynamic zone component "${componentUid}" is not allowed by the schema at ${ctx.path.join(".")}`,
        "INVALID_DYNAMIC_ZONE",
        { path: ctx.path.join("."), component: componentUid }
      );
    }
    const model = ctx.source.getModel(componentUid);
    if (!model) {
      throw new ImportExportError(
        `Cannot serialize dynamic zone component "${componentUid}" because its schema was not found.`,
        "MISSING_COMPONENT",
        { component: componentUid, path: ctx.path.join(".") }
      );
    }
    if (ctx.seen.has(record)) {
      throw new ImportExportError("Circular dynamic zone structure detected.", "CIRCULAR_COMPONENT", {
        path: ctx.path.join("."),
        component: componentUid
      });
    }
    ctx.seen.add(record);
    ctx.stats.dynamicZoneCount += 1;
    ctx.stats.componentCount += 1;
    const next = childContext(ctx, `${componentUid}[${index}]`, true);
    assertDepth(next);
    return {
      __component: componentUid,
      ...serializeAttributes(record, model, next)
    };
  }).filter((entry) => Boolean(entry));
};
var serializeScalar = (value, attribute) => {
  if (value === void 0) {
    return void 0;
  }
  if (attribute.type === "json" || attribute.type === "blocks" || attribute.customField) {
    return value === null ? null : JSON.parse(JSON.stringify(value));
  }
  return value;
};
var serializeAttribute = (value, attribute, ctx) => {
  if (value === void 0) {
    return void 0;
  }
  if (attribute.type === "media") {
    return serializeMediaValue(value, Boolean(attribute.multiple), ctx);
  }
  if (attribute.type === "relation") {
    return serializeRelationValue(value, attribute, ctx);
  }
  if (attribute.type === "component" && attribute.component) {
    return serializeComponentValue(value, attribute.component, Boolean(attribute.repeatable), ctx);
  }
  if (attribute.type === "dynamiczone") {
    return serializeDynamicZone(value, attribute, ctx);
  }
  if (isScalarAttribute(attribute) || attribute.customField) {
    return serializeScalar(value, attribute);
  }
  return void 0;
};
var serializeAttributes = (data, model, ctx) => {
  const output = {};
  for (const [name, attribute] of Object.entries(model.attributes)) {
    if (!isExportableAttribute(name, attribute)) {
      continue;
    }
    if (!(name in data)) {
      continue;
    }
    const serialized = serializeAttribute(data[name], attribute, childContext(ctx, name, false));
    if (serialized !== void 0) {
      output[name] = serialized;
    }
  }
  return output;
};
var collectMediaRefs = (value, into = []) => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectMediaRefs(entry, into));
    return into;
  }
  if (isMediaMarker(value)) {
    into.push(value.$media);
    return into;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectMediaRefs(entry, into));
  }
  return into;
};

// server/src/services/strapi/runtime.ts
var readPluginValue = (strapi, key, fallback) => {
  const plugin2 = strapi.plugin(PLUGIN_ID);
  if (!plugin2) {
    return fallback;
  }
  if (typeof plugin2.config === "function") {
    const value = plugin2.config(key);
    return value === void 0 ? fallback : value;
  }
  if (plugin2.config && typeof plugin2.config === "object" && key in plugin2.config) {
    return plugin2.config[key];
  }
  return fallback;
};
var readPluginConfig = (strapi) => ({
  maxArchiveBytes: Number(readPluginValue(strapi, "maxArchiveBytes", DEFAULT_CONFIG.maxArchiveBytes)),
  maxRecursionDepth: Number(readPluginValue(strapi, "maxRecursionDepth", DEFAULT_CONFIG.maxRecursionDepth)),
  batchSize: Number(readPluginValue(strapi, "batchSize", DEFAULT_CONFIG.batchSize)),
  concurrency: Number(readPluginValue(strapi, "concurrency", DEFAULT_CONFIG.concurrency)),
  defaultConflictStrategy: readPluginValue(strapi, "defaultConflictStrategy", DEFAULT_CONFIG.defaultConflictStrategy),
  unresolvedRelations: readPluginValue(strapi, "unresolvedRelations", DEFAULT_CONFIG.unresolvedRelations),
  storageDir: String(readPluginValue(strapi, "storageDir", "") || "")
});
var storageRoot = (strapi) => {
  const configured = readPluginConfig(strapi).storageDir;
  return configured || path.join(process.cwd(), ".tmp", "deep-import-export");
};
var rowsOf = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object" && Array.isArray(value.results)) {
    return value.results;
  }
  return [];
};
var listLocales = async (strapi) => {
  const locales = strapi.plugin("i18n")?.service("locales");
  if (!locales?.find) {
    return { codes: [], defaultLocale: null };
  }
  const found = await locales.find();
  const codes = found.map((locale) => locale.code).filter(Boolean);
  const defaultLocale = locales.getDefaultLocale ? await locales.getDefaultLocale() : codes[0] ?? null;
  return { codes, defaultLocale };
};
var findPage = async (strapi, source, input) => {
  const model = source.getModel(input.uid);
  const params = {
    pagination: { page: input.page, pageSize: input.pageSize },
    filters: input.filters,
    populate: input.populate ?? buildPopulate(input.uid, source, readPluginConfig(strapi).maxRecursionDepth)
  };
  if (model && hasDraftAndPublish(model)) {
    params.status = input.status;
  }
  if (input.locale && model && isLocalized(model)) {
    params.locale = input.locale;
  }
  const result = await strapi.documents(input.uid).findMany(params);
  return rowsOf(result);
};
var matchFromRow = (row, via, field) => {
  if (!row?.documentId) {
    return null;
  }
  return { documentId: String(row.documentId), via, field };
};
var createWritePorts = (strapi) => {
  const source = schemaSourceFromStrapi(strapi);
  const localeParams = (uid, locale) => {
    const model = source.getModel(uid);
    if (locale && model && isLocalized(model)) {
      return { locale };
    }
    return {};
  };
  return {
    async findByDocumentId(uid, documentId, locale) {
      const row = await strapi.documents(uid).findOne({ documentId, ...localeParams(uid, locale) });
      return matchFromRow(row, "documentId");
    },
    async findByField(uid, field, value, locale) {
      const row = await strapi.documents(uid).findFirst({
        filters: { [field]: { $eq: value } },
        ...localeParams(uid, locale)
      });
      return matchFromRow(row, field === "slug" ? "slug" : "unique", field);
    },
    async findSingle(uid, locale) {
      const row = await strapi.documents(uid).findFirst({ ...localeParams(uid, locale) });
      return matchFromRow(row, "singleType");
    },
    async create(input) {
      const data = input.documentId ? { ...input.data, documentId: input.documentId } : input.data;
      const created = await strapi.documents(input.uid).create({
        data,
        status: input.status ?? "draft",
        ...localeParams(input.uid, input.locale)
      });
      return { documentId: String(created.documentId) };
    },
    async update(input) {
      await strapi.documents(input.uid).update({
        documentId: input.documentId,
        data: input.data,
        status: input.status ?? "draft",
        ...localeParams(input.uid, input.locale)
      });
    },
    async publish(input) {
      const model = source.getModel(input.uid);
      if (!model || !hasDraftAndPublish(model)) {
        return;
      }
      await strapi.documents(input.uid).publish({
        documentId: input.documentId,
        ...localeParams(input.uid, input.locale)
      });
    },
    async unpublish(input) {
      const model = source.getModel(input.uid);
      if (!model || !hasDraftAndPublish(model)) {
        return;
      }
      try {
        await strapi.documents(input.uid).unpublish({
          documentId: input.documentId,
          ...localeParams(input.uid, input.locale)
        });
      } catch (error) {
        strapi.log.warn(`Unpublish skipped for ${input.uid} ${input.documentId}: ${error instanceof Error ? error.message : "not published"}`);
      }
    },
    async delete(input) {
      await strapi.documents(input.uid).delete({ documentId: input.documentId });
    },
    async readSnapshot(uid, documentId) {
      return readExportedDocument(strapi, source, uid, documentId);
    },
    async findMediaId(media) {
      const candidates = await findMediaCandidates(strapi, media);
      const { matchMedia: matchMedia2 } = await Promise.resolve().then(() => (init_match(), match_exports));
      return matchMedia2(media, candidates)?.id ?? null;
    }
  };
};
var readExportedDocument = async (strapi, source, uid, documentId) => {
  const model = source.getModel(uid);
  if (!model) {
    return null;
  }
  const locales = isLocalized(model) ? (await listLocales(strapi)).codes : [null];
  const populate = buildPopulate(uid, source, readPluginConfig(strapi).maxRecursionDepth);
  const document = {
    uid,
    kind: model.kind === "singleType" ? "singleType" : "collectionType",
    documentId,
    identity: {},
    locales: []
  };
  for (const locale of locales.length ? locales : [null]) {
    const params = { documentId, populate };
    if (locale && isLocalized(model)) {
      params.locale = locale;
    }
    const draft = hasDraftAndPublish(model) ? await strapi.documents(uid).findOne({ ...params, status: "draft" }) : await strapi.documents(uid).findOne(params);
    const published = hasDraftAndPublish(model) ? await strapi.documents(uid).findOne({ ...params, status: "published" }) : null;
    if (!draft && !published) {
      continue;
    }
    const contextFor = () => {
      const context = createSerializeContext(source, { includeRelations: true, maxDepth: readPluginConfig(strapi).maxRecursionDepth });
      return context;
    };
    const draftData = draft ? serializeAttributes(draft, model, contextFor()) : null;
    const publishedData = published ? serializeAttributes(published, model, contextFor()) : null;
    document.locales.push({
      locale,
      publicationState: publishedData && draftData ? "modified" : publishedData ? "published" : "draft",
      draft: draftData ? { data: draftData } : null,
      published: publishedData ? { data: publishedData } : null
    });
    const identitySource = publishedData ?? draftData ?? {};
    for (const field of identityFields(model)) {
      const value = identitySource[field];
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        document.identity[field] = value;
      }
    }
  }
  return document.locales.length ? document : null;
};
var findMediaCandidates = async (strapi, media) => {
  const fingerprints = media.sha256 ? rowsOf(
    await strapi.documents(`plugin::${PLUGIN_ID}.media-fingerprint`).findMany({
      filters: { sha256: { $eq: media.sha256 } }
    })
  ) : [];
  const remembered = [];
  for (const fingerprint of fingerprints) {
    const file = await strapi.db.query("plugin::upload.file").findOne({ where: { id: fingerprint.fileId } });
    if (file) {
      remembered.push(toStoredMedia(file, String(fingerprint.sha256 ?? "")));
    }
  }
  const where = media.hash ? { $or: [{ hash: media.hash }, { name: media.name, mime: media.mime }] } : { name: media.name, mime: media.mime };
  const files = await strapi.db.query("plugin::upload.file").findMany({ where, limit: 20 });
  return [...remembered, ...files.map((file) => toStoredMedia(file))];
};
var toStoredMedia = (file, sha256) => ({
  id: Number(file.id),
  documentId: typeof file.documentId === "string" ? file.documentId : null,
  hash: typeof file.hash === "string" ? file.hash : null,
  name: typeof file.name === "string" ? file.name : null,
  mime: typeof file.mime === "string" ? file.mime : null,
  size: typeof file.size === "number" ? file.size : null,
  sizeInBytes: typeof file.sizeInBytes === "number" ? file.sizeInBytes : null,
  sha256: sha256 ?? null
});
var uploadMediaFile = async (strapi, media, bytes) => {
  const upload = strapi.plugin("upload").service("upload");
  const safeName = path.basename(media.name).replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  const directory = path.join(storageRoot(strapi), "uploads");
  await mkdir(directory, { recursive: true });
  const filepath = path.join(directory, `${createHash("sha256").update(bytes).digest("hex").slice(0, 12)}-${safeName}`);
  await writeFile(filepath, bytes);
  try {
    const uploaded = await upload.upload({
      data: {
        fileInfo: {
          name: media.name,
          alternativeText: media.alternativeText ?? void 0,
          caption: media.caption ?? void 0
        }
      },
      files: {
        filepath,
        originalFilename: safeName,
        mimetype: media.mime || "application/octet-stream",
        size: bytes.length
      }
    });
    return toStoredMedia(uploaded[0]);
  } finally {
    await rmQuiet(filepath);
  }
};
var rememberMedia = async (strapi, sha256, media) => {
  const existing = await strapi.documents(`plugin::${PLUGIN_ID}.media-fingerprint`).findFirst({
    filters: { sha256: { $eq: sha256 } }
  });
  if (existing) {
    return;
  }
  await strapi.documents(`plugin::${PLUGIN_ID}.media-fingerprint`).create({
    data: {
      sha256,
      fileId: media.id,
      name: media.name,
      mime: media.mime,
      size: media.sizeInBytes ?? null
    }
  });
};
var deleteMedia = async (strapi, id) => {
  const upload = strapi.plugin("upload").service("upload");
  const file = await strapi.db.query("plugin::upload.file").findOne({ where: { id } });
  if (file && upload.remove) {
    await upload.remove(file);
  }
};
var readUploadBytes = async (strapi, file) => {
  const url = typeof file.url === "string" ? file.url : "";
  if (url.startsWith("/")) {
    const local = path.join(strapi.dirs.static.public, url);
    try {
      return await readFile(local);
    } catch {
      const serverUrl = String(strapi.config.get("server.url", ""));
      if (serverUrl) {
        const response = await fetch(new URL(url, serverUrl));
        if (!response.ok) {
          throw new Error(`Could not download media ${url}`);
        }
        return Buffer.from(await response.arrayBuffer());
      }
    }
  }
  if (/^https?:\/\//i.test(url)) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not download media ${file.name ?? url}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error(`Media ${String(file.name ?? file.id)} has no readable URL.`);
};
var rmQuiet = async (filePath) => {
  const { rm: rm3 } = await import("node:fs/promises");
  await rm3(filePath, { force: true });
};

// server/src/bootstrap.ts
var bootstrap = async ({ strapi }) => {
  const actions = [
    {
      section: "plugins",
      displayName: "Access Import / Export",
      uid: "read",
      pluginName: PLUGIN_ID
    },
    {
      section: "plugins",
      displayName: "Export content",
      uid: "export",
      pluginName: PLUGIN_ID
    },
    {
      section: "plugins",
      displayName: "Import content",
      uid: "import",
      pluginName: PLUGIN_ID
    }
  ];
  const host = strapi;
  const permission = host.service?.("admin::permission");
  if (permission?.actionProvider?.registerMany) {
    await permission.actionProvider.registerMany(actions);
  }
  const pending = path2.join(storageRoot(strapi), "pending");
  try {
    const files = await readdir(pending);
    const cutoff = Date.now() - 24 * 60 * 60 * 1e3;
    for (const file of files) {
      const full = path2.join(pending, file);
      const info = await stat(full);
      if (info.mtimeMs < cutoff) {
        await rm(full, { force: true });
      }
    }
  } catch {
  }
};
var bootstrap_default = bootstrap;

// server/src/config/index.ts
var config = {
  default: {
    maxArchiveBytes: 200 * 1024 * 1024,
    maxRecursionDepth: 32,
    batchSize: 25,
    concurrency: 3,
    defaultConflictStrategy: "skip",
    unresolvedRelations: "error",
    storageDir: ""
  },
  validator(config2) {
    const depth = Number(config2.maxRecursionDepth);
    const bytes = Number(config2.maxArchiveBytes);
    const batch = Number(config2.batchSize);
    if (!Number.isFinite(depth) || depth < 1 || depth > 100) {
      throw new Error("maxRecursionDepth must be between 1 and 100");
    }
    if (!Number.isFinite(bytes) || bytes < 1024) {
      throw new Error("maxArchiveBytes must be at least 1024");
    }
    if (!Number.isFinite(batch) || batch < 1 || batch > 200) {
      throw new Error("batchSize must be between 1 and 200");
    }
    const strategy = config2.defaultConflictStrategy;
    if (strategy && !["skip", "update", "create", "ask"].includes(String(strategy))) {
      throw new Error("defaultConflictStrategy is invalid");
    }
  }
};
var config_default = config;

// server/src/content-types/job/schema.json
var schema_default = {
  kind: "collectionType",
  collectionName: "deep_import_export_jobs",
  info: {
    singularName: "job",
    pluralName: "jobs",
    displayName: "Import Export Job"
  },
  options: {
    draftAndPublish: false
  },
  pluginOptions: {
    "content-manager": { visible: false },
    "content-type-builder": { visible: false }
  },
  attributes: {
    operation: {
      type: "enumeration",
      enum: ["export", "import"],
      required: true
    },
    state: {
      type: "enumeration",
      enum: ["queued", "running", "completed", "failed"],
      required: true,
      default: "queued"
    },
    startedAt: { type: "datetime" },
    finishedAt: { type: "datetime" },
    summary: { type: "json" },
    progress: { type: "json" },
    errors: { type: "json" },
    warnings: { type: "json" },
    options: { type: "json" },
    archivePath: { type: "string" },
    rollback: { type: "json" }
  }
};

// server/src/content-types/job/index.ts
var job_default = { schema: schema_default };

// server/src/content-types/media-fingerprint/schema.json
var schema_default2 = {
  kind: "collectionType",
  collectionName: "deep_import_export_media_fingerprints",
  info: {
    singularName: "media-fingerprint",
    pluralName: "media-fingerprints",
    displayName: "Media Fingerprint"
  },
  options: {
    draftAndPublish: false
  },
  pluginOptions: {
    "content-manager": { visible: false },
    "content-type-builder": { visible: false }
  },
  attributes: {
    sha256: { type: "string", required: true, unique: true },
    fileId: { type: "integer", required: true },
    name: { type: "string" },
    mime: { type: "string" },
    size: { type: "biginteger" }
  }
};

// server/src/content-types/media-fingerprint/index.ts
var media_fingerprint_default = { schema: schema_default2 };

// server/src/content-types/index.ts
var content_types_default = {
  job: job_default,
  "media-fingerprint": media_fingerprint_default
};

// server/src/services/transfer.ts
import { randomUUID } from "node:crypto";
import { createReadStream as createReadStream3 } from "node:fs";
import { mkdir as mkdir4, copyFile, open, stat as stat3 } from "node:fs/promises";
import path5 from "node:path";

// server/src/services/exporter/run.ts
import { createHash as createHash2 } from "node:crypto";
import { mkdir as mkdir2, writeFile as writeFile2 } from "node:fs/promises";
import path3 from "node:path";

// server/src/services/archive/json-stream.ts
import { createReadStream, createWriteStream } from "node:fs";
import { once } from "node:events";
var DocumentJsonWriter = class {
  stream;
  started = false;
  constructor(filePath) {
    this.stream = createWriteStream(filePath);
  }
  async writeDocument(document) {
    const prefix = this.started ? "," : '{"documents":[';
    this.started = true;
    const payload = prefix + JSON.stringify(document);
    if (!this.stream.write(payload)) {
      await once(this.stream, "drain");
    }
  }
  async close() {
    const ending = this.started ? "]}" : '{"documents":[]}';
    this.stream.end(ending);
    await once(this.stream, "finish");
  }
};
var readDocumentArray = async (filePath, onDocument) => {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  let capturing = false;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let buffer = "";
  let seenArray = false;
  let prefix = "";
  for await (const chunk of stream) {
    const text = String(chunk);
    if (!seenArray) {
      prefix += text;
      const marker = prefix.indexOf("[");
      if (marker === -1) {
        if (prefix.length > 1e6) {
          throw new ImportExportError("data.json does not contain a documents array.", "MALFORMED_DATA");
        }
        continue;
      }
      seenArray = true;
      await consume(prefix.slice(marker + 1));
      prefix = "";
      continue;
    }
    await consume(text);
  }
  if (!seenArray) {
    throw new ImportExportError("data.json does not contain a documents array.", "MALFORMED_DATA");
  }
  async function consume(text) {
    for (const char of text) {
      if (!capturing) {
        if (char === "{") {
          capturing = true;
          depth = 1;
          inString = false;
          escaped = false;
          buffer = "{";
        } else if (char === "]") {
          return;
        }
        continue;
      }
      buffer += char;
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            await onDocument(JSON.parse(buffer));
          } catch (error) {
            throw new ImportExportError("data.json contains a document that is not valid JSON.", "MALFORMED_DATA", {
              cause: error instanceof Error ? error.message : "parse error"
            });
          }
          capturing = false;
          buffer = "";
        }
      }
    }
  }
};

// server/src/services/archive/zip.ts
import { createReadStream as createReadStream2, createWriteStream as createWriteStream2 } from "node:fs";
import { stat as stat2 } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import { pipeline } from "node:stream/promises";
var CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 3988292384 ^ crc >>> 1 : crc >>> 1;
  }
  return crc >>> 0;
});
var crc32 = (data, seed = 0) => {
  let crc = seed ^ 4294967295;
  for (let index = 0; index < data.length; index += 1) {
    crc = CRC_TABLE[(crc ^ data[index]) & 255] ^ crc >>> 8;
  }
  return (crc ^ 4294967295) >>> 0;
};
var LOCAL_SIGNATURE = 67324752;
var CENTRAL_SIGNATURE = 33639248;
var END_SIGNATURE = 101010256;
var UTF8_FLAG = 2048;
var dosTime = (date) => {
  const time = date.getHours() << 11 | date.getMinutes() << 5 | Math.floor(date.getSeconds() / 2);
  const day = date.getFullYear() - 1980 << 9 | date.getMonth() + 1 << 5 | date.getDate();
  return { time, day };
};
var ZipWriter = class {
  entries = [];
  offset = 0;
  stream;
  closed = false;
  constructor(filePath) {
    this.stream = createWriteStream2(filePath);
  }
  async addBuffer(name, data) {
    this.assertName(name);
    const checksum = crc32(data);
    await this.writeLocal(name, checksum, data.length, data);
  }
  async addFile(name, filePath) {
    this.assertName(name);
    const info = await stat2(filePath);
    let checksum = 0;
    await new Promise((resolve, reject) => {
      const reader = createReadStream2(filePath);
      reader.on("data", (chunk) => {
        checksum = crc32(chunk, checksum);
      });
      reader.on("error", reject);
      reader.on("end", () => resolve());
    });
    const { time, day } = dosTime(/* @__PURE__ */ new Date());
    const nameBuffer = Buffer.from(name, "utf8");
    const header = Buffer.alloc(30);
    header.writeUInt32LE(LOCAL_SIGNATURE, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(UTF8_FLAG, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(day, 12);
    header.writeUInt32LE(checksum >>> 0, 14);
    header.writeUInt32LE(info.size, 18);
    header.writeUInt32LE(info.size, 22);
    header.writeUInt16LE(nameBuffer.length, 26);
    header.writeUInt16LE(0, 28);
    const start = this.offset;
    await this.write(header);
    await this.write(nameBuffer);
    await pipeline(createReadStream2(filePath), this.stream, { end: false });
    this.offset += info.size;
    this.entries.push({ name, crc: checksum >>> 0, size: info.size, offset: start });
  }
  async close() {
    if (this.closed) {
      return;
    }
    const centralStart = this.offset;
    for (const entry of this.entries) {
      const nameBuffer = Buffer.from(entry.name, "utf8");
      const header = Buffer.alloc(46);
      header.writeUInt32LE(CENTRAL_SIGNATURE, 0);
      header.writeUInt16LE(20, 4);
      header.writeUInt16LE(20, 6);
      header.writeUInt16LE(UTF8_FLAG, 8);
      header.writeUInt16LE(0, 10);
      header.writeUInt16LE(0, 12);
      header.writeUInt16LE(0, 14);
      header.writeUInt32LE(entry.crc, 16);
      header.writeUInt32LE(entry.size, 20);
      header.writeUInt32LE(entry.size, 24);
      header.writeUInt16LE(nameBuffer.length, 28);
      header.writeUInt16LE(0, 30);
      header.writeUInt16LE(0, 32);
      header.writeUInt16LE(0, 34);
      header.writeUInt16LE(0, 36);
      header.writeUInt32LE(0, 38);
      header.writeUInt32LE(entry.offset, 42);
      await this.write(header);
      await this.write(nameBuffer);
    }
    const centralSize = this.offset - centralStart;
    const end = Buffer.alloc(22);
    end.writeUInt32LE(END_SIGNATURE, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(this.entries.length, 8);
    end.writeUInt16LE(this.entries.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(centralStart, 16);
    end.writeUInt16LE(0, 20);
    await this.write(end);
    await new Promise((resolve, reject) => {
      this.stream.end(() => resolve());
      this.stream.on("error", reject);
    });
    this.closed = true;
  }
  async writeLocal(name, checksum, size, data) {
    const { time, day } = dosTime(/* @__PURE__ */ new Date());
    const nameBuffer = Buffer.from(name, "utf8");
    const header = Buffer.alloc(30);
    header.writeUInt32LE(LOCAL_SIGNATURE, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(UTF8_FLAG, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(time, 10);
    header.writeUInt16LE(day, 12);
    header.writeUInt32LE(checksum >>> 0, 14);
    header.writeUInt32LE(size, 18);
    header.writeUInt32LE(size, 22);
    header.writeUInt16LE(nameBuffer.length, 26);
    header.writeUInt16LE(0, 28);
    const start = this.offset;
    await this.write(Buffer.concat([header, nameBuffer, data]));
    this.entries.push({ name, crc: checksum >>> 0, size, offset: start });
  }
  write(chunk) {
    return new Promise((resolve, reject) => {
      this.stream.write(chunk, (error) => {
        if (error) {
          reject(error);
          return;
        }
        this.offset += chunk.length;
        resolve();
      });
    });
  }
  assertName(name) {
    assertSafeEntryName(name);
  }
};
var assertSafeEntryName = (name) => {
  const normalized = name.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || normalized.includes("\0")) {
    throw new ImportExportError(`Archive entry "${name}" is not allowed.`, "UNSAFE_PATH", { name });
  }
  const parts = normalized.split("/");
  if (parts.some((part) => part === ".." || part === ".")) {
    throw new ImportExportError(`Archive entry "${name}" escapes the package root.`, "PATH_TRAVERSAL", { name });
  }
  const allowed = normalized === "manifest.json" || normalized === "data.json" || normalized === "schemas.json" || normalized === "README.md" || normalized.startsWith("media/") && parts.length === 2 && parts[1].length > 0;
  if (!allowed) {
    throw new ImportExportError(`Archive entry "${name}" is not part of the export format.`, "UNEXPECTED_ENTRY", { name });
  }
  return normalized;
};
var sanitizeFileName = (value) => {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  return cleaned.slice(0, 80) || "file";
};
var readZip = async (filePath, maxBytes) => {
  const info = await stat2(filePath);
  if (info.size > maxBytes) {
    throw new ImportExportError(`Archive is larger than the ${maxBytes} byte limit.`, "ARCHIVE_TOO_LARGE", {
      size: info.size,
      maxBytes
    });
  }
  const { readFile: readFile3 } = await import("node:fs/promises");
  const buffer = await readFile3(filePath);
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== LOCAL_SIGNATURE) {
    throw new ImportExportError("Uploaded file is not a ZIP archive.", "INVALID_ARCHIVE");
  }
  const entries = [];
  let offset = 0;
  let uncompressed = 0;
  while (offset + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature === CENTRAL_SIGNATURE || signature === END_SIGNATURE) {
      break;
    }
    if (signature !== LOCAL_SIGNATURE) {
      throw new ImportExportError("The archive contains an unsupported ZIP structure.", "INVALID_ARCHIVE");
    }
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString("utf8");
    const dataStart = nameStart + nameLength + extraLength;
    if (flags & 1) {
      throw new ImportExportError("Encrypted archives are not supported.", "ENCRYPTED_ARCHIVE", { name });
    }
    if (flags & 8 || compressedSize === 4294967295) {
      throw new ImportExportError("ZIP data descriptors are not supported. Re-export the package with this plugin.", "UNSUPPORTED_ZIP", { name });
    }
    const safeName = assertSafeEntryName(name);
    const slice = buffer.subarray(dataStart, dataStart + compressedSize);
    let data;
    if (method === 0) {
      data = Buffer.from(slice);
    } else if (method === 8) {
      if (uncompressedSize > maxBytes) {
        throw new ImportExportError("Archive entry expands beyond the size limit.", "ZIP_BOMB", { name });
      }
      data = inflateRawSync(slice);
    } else {
      throw new ImportExportError(`Unsupported ZIP compression method ${method}.`, "UNSUPPORTED_ZIP", { name, method });
    }
    if (uncompressedSize !== 0 && data.length !== uncompressedSize) {
      throw new ImportExportError(`Archive entry "${safeName}" failed a size check.`, "CORRUPT_ENTRY", { name: safeName });
    }
    uncompressed += data.length;
    if (uncompressed > maxBytes) {
      throw new ImportExportError("Uncompressed archive exceeds the size limit.", "ZIP_BOMB");
    }
    entries.push({ name: safeName, data });
    offset = dataStart + compressedSize;
    if (entries.length > 1e4) {
      throw new ImportExportError("Archive contains too many files.", "TOO_MANY_FILES");
    }
  }
  return entries;
};

// server/src/services/schema/snapshot.ts
var PUBLIC_ATTRIBUTE_KEYS = [
  "type",
  "required",
  "unique",
  "repeatable",
  "multiple",
  "component",
  "components",
  "relation",
  "target",
  "mappedBy",
  "inversedBy",
  "enum",
  "customField",
  "allowedTypes",
  "targetField"
];
var sanitizeAttribute = (attribute) => {
  const next = { type: attribute.type };
  for (const key of PUBLIC_ATTRIBUTE_KEYS) {
    const value = attribute[key];
    if (value !== void 0) {
      Object.assign(next, { [key]: value });
    }
  }
  if (attribute.pluginOptions?.i18n) {
    next.pluginOptions = { i18n: { localized: attribute.pluginOptions.i18n.localized } };
  }
  return next;
};
var sanitizeModel = (model) => {
  const attributes = {};
  for (const [name, attribute] of Object.entries(model.attributes)) {
    if (attribute.private || attribute.type === "password") {
      continue;
    }
    attributes[name] = sanitizeAttribute(attribute);
  }
  return {
    uid: model.uid,
    modelType: model.modelType,
    kind: model.kind,
    displayName: model.displayName,
    options: model.options?.draftAndPublish === void 0 ? void 0 : { draftAndPublish: model.options.draftAndPublish },
    pluginOptions: model.pluginOptions?.i18n ? { i18n: { localized: model.pluginOptions.i18n.localized } } : void 0,
    attributes
  };
};
var buildSchemaSnapshot = (source, contentTypeUids) => {
  const contentTypes = {};
  const components = {};
  const pendingContentTypes = [...contentTypeUids];
  const seenContentTypes = /* @__PURE__ */ new Set();
  const visitComponent = (uid, stack) => {
    if (components[uid] || stack.includes(uid)) {
      return;
    }
    const model = source.getModel(uid);
    if (!model) {
      return;
    }
    components[uid] = sanitizeModel(model);
    const nextStack = [...stack, uid];
    for (const attribute of Object.values(model.attributes)) {
      if (attribute.type === "component" && attribute.component) {
        visitComponent(attribute.component, nextStack);
      }
      if (attribute.type === "dynamiczone") {
        for (const componentUid of attribute.components ?? []) {
          visitComponent(componentUid, nextStack);
        }
      }
      if (attribute.type === "relation" && attribute.target && !seenContentTypes.has(attribute.target)) {
        pendingContentTypes.push(attribute.target);
      }
    }
  };
  while (pendingContentTypes.length > 0) {
    const uid = pendingContentTypes.pop();
    if (seenContentTypes.has(uid)) {
      continue;
    }
    seenContentTypes.add(uid);
    const model = source.getModel(uid);
    if (!model || model.modelType !== "contentType") {
      continue;
    }
    contentTypes[uid] = sanitizeModel(model);
    for (const attribute of Object.values(model.attributes)) {
      if (attribute.type === "component" && attribute.component) {
        visitComponent(attribute.component, []);
      }
      if (attribute.type === "dynamiczone") {
        for (const componentUid of attribute.components ?? []) {
          visitComponent(componentUid, []);
        }
      }
      if (attribute.type === "relation" && attribute.target) {
        pendingContentTypes.push(attribute.target);
      }
    }
  }
  return { contentTypes, components };
};

// server/src/services/exporter/run.ts
var stable = (value) => JSON.stringify(value);
var publicationState = (draft, published, enabled) => {
  if (!enabled) {
    return "unversioned";
  }
  if (draft && published) {
    return stable(draft) === stable(published) ? "published" : "modified";
  }
  if (published) {
    return "published";
  }
  return "draft";
};
var versionData = (raw, modelUid, source, includeRelations, maxDepth, onMedia, stats) => {
  if (!raw) {
    return null;
  }
  const model = source.getModel(modelUid);
  if (!model) {
    return null;
  }
  const context = createSerializeContext(source, { includeRelations, maxDepth });
  if (stats) {
    context.stats = stats;
  }
  context.onMedia = onMedia;
  return serializeAttributes(raw, model, context);
};
var runExport = async (selection, directory, dependencies) => {
  if (!selection.contentTypes.length) {
    throw new ImportExportError("Select at least one content type to export.", "EMPTY_SELECTION");
  }
  await mkdir2(directory, { recursive: true });
  const mediaGroups = /* @__PURE__ */ new Map();
  const onMedia = (raw, ref) => {
    const groupKey = String(raw.hash || raw.documentId || raw.id || ref.name);
    const group = mediaGroups.get(groupKey) ?? [];
    group.push({ ref, raw });
    mediaGroups.set(groupKey, group);
  };
  const documents = [];
  const stats = emptyStats();
  const localeInfo = await dependencies.listLocales();
  let entryDone = 0;
  const typeTotal = selection.contentTypes.length;
  await dependencies.onProgress("contentTypes", 0, typeTotal);
  for (const [typeIndex, uid] of selection.contentTypes.entries()) {
    const model = dependencies.source.getModel(uid);
    if (!model || model.modelType !== "contentType") {
      throw new ImportExportError(`Content type ${uid} does not exist.`, "MISSING_CONTENT_TYPE", { uid });
    }
    const localized = isLocalized(model);
    const locales = localized ? selection.locales?.length ? selection.locales : localeInfo.codes : [null];
    const orderedLocales = [...locales].sort((left, right) => {
      if (left === localeInfo.defaultLocale) return -1;
      if (right === localeInfo.defaultLocale) return 1;
      return 0;
    });
    const populate = buildPopulate(uid, dependencies.source, dependencies.maxDepth);
    const filters = { ...selection.filters ?? {} };
    if (selection.documentIds?.length) {
      filters.documentId = { $in: selection.documentIds };
    }
    const draftEnabled = hasDraftAndPublish(model);
    const statuses = !draftEnabled || selection.status === "published" ? ["published"] : selection.status === "draft" ? ["draft"] : ["draft", "published"];
    const grouped = /* @__PURE__ */ new Map();
    for (const locale of orderedLocales) {
      for (const status of statuses) {
        let page = 1;
        while (true) {
          const rows = await dependencies.findPage({
            uid,
            status,
            locale,
            page,
            pageSize: dependencies.batchSize,
            populate,
            filters
          });
          if (!rows.length) {
            break;
          }
          for (const row of rows) {
            const documentId = String(row.documentId ?? "");
            if (!documentId) {
              continue;
            }
            const key = `${documentId}:${locale ?? ""}`;
            const current = grouped.get(key) ?? { locale };
            current[status] = row;
            grouped.set(key, current);
          }
          entryDone += rows.length;
          await dependencies.onProgress("entries", entryDone, entryDone);
          if (rows.length < dependencies.batchSize) {
            break;
          }
          page += 1;
        }
      }
    }
    const byDocument = /* @__PURE__ */ new Map();
    for (const entry of grouped.values()) {
      const raw = entry.published ?? entry.draft;
      if (!raw?.documentId) {
        continue;
      }
      const documentId = String(raw.documentId);
      let document = byDocument.get(documentId);
      if (!document) {
        document = {
          uid,
          kind: model.kind === "singleType" ? "singleType" : "collectionType",
          documentId,
          identity: {},
          locales: []
        };
        byDocument.set(documentId, document);
      }
      const countTarget = entry.published ? "published" : "draft";
      const draft = versionData(
        entry.draft,
        uid,
        dependencies.source,
        selection.includeRelations,
        dependencies.maxDepth,
        onMedia,
        countTarget === "draft" ? stats : void 0
      );
      const published = versionData(
        entry.published,
        uid,
        dependencies.source,
        selection.includeRelations,
        dependencies.maxDepth,
        onMedia,
        countTarget === "published" ? stats : void 0
      );
      const state = publicationState(draft, published, draftEnabled);
      const localeEntry = {
        locale: entry.locale,
        publicationState: state,
        draft: draft ? { data: draft } : null,
        published: published ? { data: published } : null
      };
      document.locales.push(localeEntry);
      if (!Object.keys(document.identity).length) {
        const sourceData = published ?? draft ?? {};
        for (const field of identityFields(model)) {
          const value = sourceData[field];
          if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            document.identity[field] = value;
          }
        }
      }
    }
    documents.push(...byDocument.values());
    await dependencies.onProgress("contentTypes", typeIndex + 1, typeTotal);
    await dependencies.onProgress("components", dependencies.source.components().length, dependencies.source.components().length);
  }
  const mediaDir = path3.join(directory, "media");
  await mkdir2(mediaDir, { recursive: true });
  let mediaIndex = 1;
  const groups = [...mediaGroups.values()];
  for (const [index, group] of groups.entries()) {
    const raw = group[0].raw;
    const ext = sanitizeFileName(typeof raw.ext === "string" ? raw.ext : path3.extname(String(raw.name ?? "")));
    const base2 = sanitizeFileName(path3.basename(String(raw.name ?? "file"), path3.extname(String(raw.name ?? "file"))));
    const fileName = `${String(mediaIndex).padStart(4, "0")}-${base2}${ext.startsWith(".") || !ext ? ext : `.${ext}`}`;
    const key = `media/${fileName}`;
    let sha256;
    if (selection.includeMedia) {
      const bytes = await dependencies.readMedia(raw);
      sha256 = createHash2("sha256").update(bytes).digest("hex");
      await writeFile2(path3.join(directory, key), bytes);
    }
    for (const item of group) {
      item.ref.key = key;
      if (sha256) {
        item.ref.sha256 = sha256;
      }
    }
    mediaIndex += 1;
    await dependencies.onProgress("media", index + 1, groups.length);
  }
  await dependencies.onProgress("relations", stats.relationCount, stats.relationCount);
  const [major, minor] = dependencies.strapiVersion.split(".").map((part) => Number(part) || 0);
  const schemas = buildSchemaSnapshot(dependencies.source, selection.contentTypes);
  const manifest = {
    formatVersion: FORMAT_VERSION,
    strapiVersion: dependencies.strapiVersion,
    strapiMajorVersion: major,
    strapiMinorVersion: minor,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    sourceEnvironment: dependencies.environment,
    locales: localeInfo.codes,
    contentTypes: selection.contentTypes,
    components: Object.keys(schemas.components),
    mediaCount: groups.length,
    relationCount: stats.relationCount,
    entryCount: documents.length,
    componentCount: stats.componentCount,
    dynamicZoneCount: stats.dynamicZoneCount,
    includeMedia: selection.includeMedia,
    includeRelations: selection.includeRelations,
    plugin: "deep-import-export"
  };
  const readme = [
    "# Strapi deep export",
    "",
    `Exported at ${manifest.exportedAt} from ${manifest.sourceEnvironment}.`,
    `Format ${manifest.formatVersion}, Strapi ${manifest.strapiVersion}.`,
    "",
    "This archive contains content documents, a schema snapshot, and optional media files.",
    "It does not contain secrets, API tokens, or environment configuration.",
    "",
    "Import it with the Deep Import / Export plugin on another Strapi 5 instance.",
    ""
  ].join("\n");
  const dataPath = path3.join(directory, PACKAGE_FILES.data);
  const writer = new DocumentJsonWriter(dataPath);
  for (const document of documents) {
    await writer.writeDocument(document);
  }
  await writer.close();
  await writeFile2(path3.join(directory, PACKAGE_FILES.manifest), JSON.stringify(manifest, null, 2));
  await writeFile2(path3.join(directory, PACKAGE_FILES.schemas), JSON.stringify(schemas, null, 2));
  await writeFile2(path3.join(directory, PACKAGE_FILES.readme), readme);
  const base = sanitizeFileName((selection.archiveName || "strapi-export").replace(/\.zip$/i, ""));
  const zipPath = path3.join(directory, `${base}.zip`);
  const zip = new ZipWriter(zipPath);
  await zip.addFile(PACKAGE_FILES.manifest, path3.join(directory, PACKAGE_FILES.manifest));
  await zip.addFile(PACKAGE_FILES.data, dataPath);
  await zip.addFile(PACKAGE_FILES.schemas, path3.join(directory, PACKAGE_FILES.schemas));
  await zip.addFile(PACKAGE_FILES.readme, path3.join(directory, PACKAGE_FILES.readme));
  if (selection.includeMedia) {
    for (const group of groups) {
      const key = group[0].ref.key;
      if (key) {
        await zip.addFile(key, path3.join(directory, key));
      }
    }
  }
  await zip.close();
  return { filePath: zipPath, manifest };
};

// server/src/services/importer/run.ts
import { createHash as createHash3 } from "node:crypto";
import { mkdir as mkdir3, readFile as readFile2, rm as rm2, writeFile as writeFile3 } from "node:fs/promises";
import path4 from "node:path";

// server/src/services/resolver/identity.ts
var uniqueEntries = (identity) => {
  return Object.entries(identity).filter((entry) => {
    const value = entry[1];
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
  });
};
var matchDocument = async (document, ports, options) => {
  const mapped = options.idMap?.[decisionKey(document.uid, document.documentId)];
  if (mapped) {
    return { documentId: mapped, via: "mapping" };
  }
  if (document.kind === "singleType") {
    const single = await ports.findSingle(document.uid, options.locale);
    if (single) {
      return { ...single, via: "singleType" };
    }
  }
  const byId = await ports.findByDocumentId(document.uid, document.documentId, options.locale);
  if (byId) {
    return { ...byId, via: "documentId" };
  }
  const fields = uniqueEntries(document.identity);
  const slug = fields.find(([field]) => field === "slug");
  const ordered = [...fields.filter(([field]) => field !== "slug"), ...slug ? [slug] : []];
  for (const [field, value] of ordered) {
    const found = await ports.findByField(document.uid, field, value, options.locale);
    if (found) {
      return { ...found, via: field === "slug" ? "slug" : "unique", field };
    }
  }
  return null;
};
var strategyFor = (strategy, hasMatch, decision, kind) => {
  if (kind === "singleType") {
    if (!hasMatch) {
      return { action: "create" };
    }
    if (strategy === "skip" || decision === "skip") {
      return { action: "skip" };
    }
    return { action: "update" };
  }
  if (!hasMatch) {
    return { action: "create" };
  }
  const chosen = strategy === "ask" ? decision : strategy;
  if (!chosen) {
    return { action: "skip", error: "Choose skip, update, or create for this existing document before importing." };
  }
  return { action: chosen };
};

// server/src/services/importer/deserialize.ts
var asRecord2 = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
};
var deserializeAttribute = (value, attribute, ctx) => {
  if (value === void 0) {
    return void 0;
  }
  if (attribute.type === "media") {
    const mapOne = (entry) => {
      if (!isMediaMarker(entry)) {
        return null;
      }
      return ctx.resolveMedia(entry.$media);
    };
    if (attribute.multiple) {
      return Array.isArray(value) ? value.map(mapOne).filter((id) => typeof id === "number") : [];
    }
    return mapOne(value);
  }
  if (attribute.type === "relation") {
    if (!isOwningRelation(attribute) || ctx.relationMode === "omit") {
      return void 0;
    }
    const mapOne = (entry) => {
      if (!isRelationMarker(entry)) {
        return null;
      }
      const resolved = ctx.resolveRelation(entry.$ref);
      if (!resolved) {
        ctx.onUnresolvedRelation?.(entry.$ref, ctx.path.join("."));
      }
      return resolved;
    };
    if (isMultipleRelation(attribute)) {
      const entries = Array.isArray(value) ? value : [];
      const ids = entries.map(mapOne).filter((id) => Boolean(id));
      if (entries.length > 0 && ids.length === 0) {
        return void 0;
      }
      return { set: ids.map((documentId) => ({ documentId })) };
    }
    if (value === null) {
      return { set: [] };
    }
    const single = mapOne(value);
    if (!single) {
      return void 0;
    }
    return { set: [{ documentId: single }] };
  }
  if (attribute.type === "component" && attribute.component) {
    const readOne = (entry, index) => {
      const record = asRecord2(entry);
      if (!record || !attribute.component) {
        return null;
      }
      return deserializeAttributes(record, ctx.model(attribute.component), {
        ...ctx,
        path: [...ctx.path, `${attribute.component}[${index}]`]
      });
    };
    if (attribute.repeatable) {
      return Array.isArray(value) ? value.map(readOne).filter(Boolean) : [];
    }
    return readOne(value, 0);
  }
  if (attribute.type === "dynamiczone") {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((entry, index) => {
      const record = asRecord2(entry);
      const componentUid = typeof record?.__component === "string" ? record.__component : "";
      if (!record || !componentUid) {
        return null;
      }
      const data = deserializeAttributes(record, ctx.model(componentUid), {
        ...ctx,
        path: [...ctx.path, `${componentUid}[${index}]`]
      });
      return { __component: componentUid, ...data };
    }).filter(Boolean);
  }
  if (isScalarAttribute(attribute) || attribute.customField) {
    if (attribute.type === "json" || attribute.type === "blocks") {
      return value === null ? null : JSON.parse(JSON.stringify(value));
    }
    return value;
  }
  return void 0;
};
var deserializeAttributes = (data, model, ctx) => {
  if (!model) {
    return {};
  }
  const output = {};
  for (const [name, attribute] of Object.entries(model.attributes)) {
    if (!(name in data) || name === "__component") {
      continue;
    }
    const deserialized = deserializeAttribute(data[name], attribute, { ...ctx, path: [...ctx.path, name] });
    if (deserialized !== void 0) {
      output[name] = deserialized;
    }
  }
  return output;
};

// server/src/services/importer/publication.ts
var planPublication = (locale, mode, draftAndPublish) => {
  const draftData = locale.draft?.data ?? locale.published?.data ?? {};
  const publishedData = locale.published?.data ?? locale.draft?.data ?? {};
  if (!draftAndPublish) {
    return { data: publishedData, publish: false, unpublish: false };
  }
  if (mode === "draft") {
    return { data: draftData, publish: false, unpublish: false };
  }
  if (mode === "publish") {
    return { data: publishedData, publish: true, unpublish: false };
  }
  if (locale.publicationState === "draft") {
    return { data: draftData, publish: false, unpublish: true };
  }
  if (locale.publicationState === "modified" && locale.draft && locale.published) {
    return {
      data: publishedData,
      draftAfterPublish: locale.draft.data,
      publish: true,
      unpublish: false
    };
  }
  return { data: publishedData, publish: true, unpublish: false };
};

// server/src/services/importer/execute.ts
var primaryLocale = (document) => document.locales[0]?.locale ?? null;
var labelOf = (document) => {
  const identity = document.identity;
  for (const key of ["title", "name", "slug", "pathname"]) {
    const value = identity[key];
    if (typeof value === "string" && value) {
      return value;
    }
  }
  return document.documentId;
};
var collectDocumentMedia = (documents) => {
  const seen = /* @__PURE__ */ new Set();
  const media = [];
  for (const document of documents) {
    for (const ref of collectMediaRefs(document)) {
      const id = ref.sha256 || ref.key || ref.hash || `${ref.name}:${ref.sizeInBytes ?? ref.size ?? ""}`;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      media.push(ref);
    }
  }
  return media;
};
var prepareImport = async (documents, source, options, ports) => {
  const issues = [];
  const conflicts = [];
  for (const document of documents) {
    const model = source.getModel(document.uid);
    if (!model) {
      continue;
    }
    const locale = primaryLocale(document);
    const match = await matchDocument(document, ports, { locale, idMap: void 0 });
    const decision = options.decisions?.[decisionKey(document.uid, document.documentId)];
    const strategy = strategyFor(options.conflictStrategy, Boolean(match), decision, document.kind);
    if (match && options.conflictStrategy !== "create") {
      conflicts.push({
        uid: document.uid,
        documentId: document.documentId,
        label: labelOf(document),
        match,
        action: strategy.action,
        error: strategy.error
      });
    }
    if (strategy.error) {
      issues.push(
        issue("error", "CONFLICT_DECISION", strategy.error, {
          uid: document.uid,
          documentId: document.documentId,
          label: labelOf(document)
        })
      );
    }
    if (document.kind === "singleType" && options.conflictStrategy === "create" && match) {
      issues.push(
        issue("warning", "SINGLE_TYPE_UPDATE", `${document.uid} is a single type, so "create new" updates the existing entry.`, {
          uid: document.uid
        })
      );
    }
    if (!isLocalized(model) && document.locales.length > 1) {
      issues.push(
        issue("warning", "LOCALE_IGNORED", `Only one locale will be written for ${document.uid}.`, {
          uid: document.uid,
          documentId: document.documentId
        })
      );
    }
  }
  return {
    issues,
    conflicts,
    media: collectDocumentMedia(documents),
    blocked: issues.some((item) => item.level === "error")
  };
};
var localeFilter = (document, options) => {
  const selected = options.locales;
  return document.locales.filter((locale) => {
    if (!selected || selected.length === 0 || selected.includes("*")) {
      return true;
    }
    return locale.locale ? selected.includes(locale.locale) : true;
  }).map((locale) => ({
    ...locale,
    locale: locale.locale && options.localeMap?.[locale.locale] ? options.localeMap[locale.locale] : locale.locale
  }));
};
var relationResolver = (idMap, ports, issues, policy) => (relation) => {
  const mapped = idMap.get(decisionKey(relation.uid, relation.documentId));
  if (mapped) {
    return mapped;
  }
  return null;
};
var executeImport = async (documents, source, options, ports, mediaIds, onProgress) => {
  const issues = [];
  const rollback = { created: [], updated: [], mediaIds: [] };
  const idMap = /* @__PURE__ */ new Map();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const resolveMedia = (media) => {
    const keys = [media.sha256, media.key, media.hash, `${media.name}:${media.sizeInBytes ?? media.size ?? ""}`].filter(
      (key) => Boolean(key)
    );
    for (const key of keys) {
      const id = mediaIds.get(key);
      if (typeof id === "number") {
        return id;
      }
    }
    return null;
  };
  const contextFor = (mode, unresolved) => ({
    relationMode: mode,
    path: [],
    model: (uid) => {
      const model = source.getModel(uid);
      if (!model) {
        throw new Error(`Missing component schema ${uid}`);
      }
      return model;
    },
    resolveMedia,
    resolveRelation: (relation) => {
      const mapped = relationResolver(idMap, ports, unresolved, options.unresolvedRelations)(relation);
      if (mapped) {
        return mapped;
      }
      return pendingLookups.get(decisionKey(relation.uid, relation.documentId)) ?? null;
    },
    onUnresolvedRelation: (relation, path6) => {
      const message = [
        "Unable to resolve relation.",
        `Referenced type: ${relation.uid}`,
        `documentId: ${relation.documentId}`,
        path6 ? `Field: ${path6}` : "",
        "Reason: Referenced document does not exist in this environment or in the import package."
      ].filter(Boolean).join("\n");
      unresolved.push(issue(options.unresolvedRelations === "error" ? "error" : "warning", "UNRESOLVED_RELATION", message, {
        uid: relation.uid,
        documentId: relation.documentId,
        path: path6,
        identity: relation.identity
      }));
    }
  });
  const pendingLookups = /* @__PURE__ */ new Map();
  try {
    const actions = [];
    for (const document of documents) {
      const match = await matchDocument(document, ports, { locale: primaryLocale(document) });
      const decision = options.decisions?.[decisionKey(document.uid, document.documentId)];
      const strategy = strategyFor(options.conflictStrategy, Boolean(match), decision, document.kind);
      if (strategy.error) {
        throw new Error(strategy.error);
      }
      actions.push({ document, action: strategy.action, match: match ?? void 0 });
      if (strategy.action === "skip") {
        skipped += 1;
        if (match) {
          idMap.set(decisionKey(document.uid, document.documentId), match.documentId);
        }
      }
    }
    onProgress?.("entries", 0, actions.length);
    for (const [index, action] of actions.entries()) {
      if (action.action === "skip") {
        onProgress?.("entries", index + 1, actions.length);
        continue;
      }
      const model = source.getModel(action.document.uid);
      if (!model) {
        failed += 1;
        continue;
      }
      const locales = localeFilter(action.document, options).slice(0, isLocalized(model) ? void 0 : 1);
      if (action.action === "update" && action.match) {
        const snapshot = await ports.readSnapshot(action.document.uid, action.match.documentId);
        if (snapshot) {
          rollback.updated.push(snapshot);
        }
      }
      let destinationId = action.match?.documentId;
      if (action.action === "create") {
        const taken = await ports.findByDocumentId(action.document.uid, action.document.documentId, primaryLocale(action.document));
        destinationId = taken ? void 0 : action.document.documentId;
      }
      const first = locales[0];
      const publication = planPublication(first, options.publishMode, hasDraftAndPublish(model));
      const baseData = deserializeAttributes(publication.data, model, contextFor("omit", issues));
      if (action.action === "create") {
        const createdDoc = await ports.create({
          uid: action.document.uid,
          documentId: destinationId,
          locale: first.locale,
          data: destinationId ? { ...baseData, documentId: destinationId } : baseData,
          status: "draft"
        });
        destinationId = createdDoc.documentId;
        rollback.created.push({ uid: action.document.uid, documentId: destinationId });
        created += 1;
      } else if (destinationId) {
        await ports.update({
          uid: action.document.uid,
          documentId: destinationId,
          locale: first.locale,
          data: baseData,
          status: "draft"
        });
        updated += 1;
      }
      if (!destinationId) {
        failed += 1;
        continue;
      }
      idMap.set(decisionKey(action.document.uid, action.document.documentId), destinationId);
      for (const locale of locales.slice(1)) {
        const extra = planPublication(locale, options.publishMode, hasDraftAndPublish(model));
        const data = deserializeAttributes(extra.data, model, contextFor("omit", issues));
        await ports.update({
          uid: action.document.uid,
          documentId: destinationId,
          locale: locale.locale,
          data,
          status: "draft"
        });
      }
      onProgress?.("entries", index + 1, actions.length);
    }
    onProgress?.("relations", 0, actions.length);
    for (const [index, action] of actions.entries()) {
      if (action.action === "skip") {
        continue;
      }
      const model = source.getModel(action.document.uid);
      const destinationId = idMap.get(decisionKey(action.document.uid, action.document.documentId));
      if (!model || !destinationId) {
        continue;
      }
      const locales = localeFilter(action.document, options).slice(0, isLocalized(model) ? void 0 : 1);
      for (const locale of locales) {
        const version = planPublication(locale, options.publishMode, hasDraftAndPublish(model));
        const unresolved = [];
        await resolveExternalRelations(version.data, ports, pendingLookups);
        const data = deserializeAttributes(version.data, model, contextFor("resolve", unresolved));
        const errors = unresolved.filter((item) => item.level === "error");
        if (errors.length > 0) {
          issues.push(...errors);
          throw new Error(errors[0].message);
        }
        issues.push(...unresolved);
        await ports.update({
          uid: action.document.uid,
          documentId: destinationId,
          locale: locale.locale,
          data,
          status: "draft"
        });
        if (version.publish) {
          await ports.publish({ uid: action.document.uid, documentId: destinationId, locale: locale.locale });
        } else if (version.unpublish && hasDraftAndPublish(model)) {
          await ports.unpublish({ uid: action.document.uid, documentId: destinationId, locale: locale.locale });
        }
        if (version.draftAfterPublish) {
          const draftData = deserializeAttributes(version.draftAfterPublish, model, contextFor("resolve", issues));
          await ports.update({
            uid: action.document.uid,
            documentId: destinationId,
            locale: locale.locale,
            data: draftData,
            status: "draft"
          });
        }
      }
      onProgress?.("relations", index + 1, actions.length);
    }
    return { created, updated, skipped, failed, issues, rollback: { attempted: false, completed: false, failures: [] } };
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : "Import failed.";
    issues.push(issue("error", "IMPORT_FAILED", message));
    const rollbackReport = await rollbackImport(ports, source, options, rollback);
    return {
      created,
      updated,
      skipped,
      failed,
      issues,
      rollback: rollbackReport
    };
  }
};
var resolveExternalRelations = async (value, ports, cache) => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      await resolveExternalRelations(entry, ports, cache);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  if ("$ref" in value) {
    const relation = value.$ref;
    const key = decisionKey(relation.uid, relation.documentId);
    if (!cache.has(key)) {
      const byId = await ports.findByDocumentId(relation.uid, relation.documentId, relation.locale ?? null);
      if (byId) {
        cache.set(key, byId.documentId);
      } else if (relation.identity) {
        let found = null;
        for (const [field, fieldValue] of Object.entries(relation.identity)) {
          const match = await ports.findByField(relation.uid, field, fieldValue, relation.locale ?? null);
          if (match) {
            found = match.documentId;
            break;
          }
        }
        cache.set(key, found);
      } else {
        cache.set(key, null);
      }
    }
    return;
  }
  for (const entry of Object.values(value)) {
    await resolveExternalRelations(entry, ports, cache);
  }
};
var rollbackImport = async (ports, source, options, record) => {
  const failures = [];
  for (const created of record.created) {
    try {
      await ports.delete(created);
    } catch (error) {
      failures.push(`Could not delete created ${created.uid} ${created.documentId}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  for (const snapshot of record.updated) {
    try {
      const model = source.getModel(snapshot.uid);
      if (!model) {
        failures.push(`Could not restore ${snapshot.uid} because its schema is missing.`);
        continue;
      }
      for (const locale of snapshot.locales) {
        const publication = planPublication(locale, "preserve", hasDraftAndPublish(model));
        const restoredMedia = /* @__PURE__ */ new Map();
        for (const media of collectMediaRefs(publication.data)) {
          const id = await ports.findMediaId(media);
          const key = media.sha256 || media.hash || media.key || media.name;
          if (typeof id === "number") {
            restoredMedia.set(key, id);
          }
        }
        const data = deserializeAttributes(publication.data, model, {
          relationMode: "resolve",
          path: [],
          model: (uid) => {
            const nested = source.getModel(uid);
            if (!nested) {
              throw new Error(uid);
            }
            return nested;
          },
          resolveMedia: (media) => {
            const key = media.sha256 || media.hash || media.key || media.name;
            return restoredMedia.get(key) ?? null;
          },
          resolveRelation: (relation) => relation.documentId
        });
        await ports.update({
          uid: snapshot.uid,
          documentId: snapshot.documentId,
          locale: locale.locale,
          data,
          status: "draft"
        });
        if (publication.publish) {
          await ports.publish({ uid: snapshot.uid, documentId: snapshot.documentId, locale: locale.locale });
        }
      }
    } catch (error) {
      failures.push(`Could not restore ${snapshot.uid} ${snapshot.documentId}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  return {
    attempted: true,
    completed: failures.length === 0,
    failures
  };
};

// server/src/services/importer/run.ts
init_match();

// server/src/services/validation/validate.ts
var emptyStats2 = () => ({
  contentTypes: 0,
  entries: 0,
  components: 0,
  dynamicZones: 0,
  relations: 0,
  media: 0
});
var isObject = (value) => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};
var parseVersion = (version) => {
  const [major, minor] = String(version).split(".").map((part) => Number(part));
  return { major: Number.isFinite(major) ? major : 0, minor: Number.isFinite(minor) ? minor : 0 };
};
var validateManifest = (manifest) => {
  const issues = [];
  if (!isObject(manifest)) {
    return [issue("error", "MALFORMED_MANIFEST", "manifest.json must be a JSON object.")];
  }
  const format = parseVersion(String(manifest.formatVersion ?? ""));
  if (format.major !== SUPPORTED_FORMAT_MAJOR) {
    issues.push(
      issue(
        "error",
        "INCOMPATIBLE_FORMAT",
        `Export package format ${String(manifest.formatVersion)} is not supported. This plugin reads format ${SUPPORTED_FORMAT_MAJOR}.x.`
      )
    );
  }
  const strapiVersion = parseVersion(String(manifest.strapiVersion ?? manifest.strapiMajorVersion ?? ""));
  const major = typeof manifest.strapiMajorVersion === "number" ? manifest.strapiMajorVersion : strapiVersion.major;
  if (major !== SUPPORTED_STRAPI_MAJOR) {
    issues.push(
      issue(
        "error",
        "INCOMPATIBLE_STRAPI",
        `Export package was created with Strapi ${major || "unknown"}. This project runs Strapi ${SUPPORTED_STRAPI_MAJOR}.x. Import is blocked.`
      )
    );
  }
  if (manifest.plugin && manifest.plugin !== "deep-import-export") {
    issues.push(issue("error", "UNKNOWN_PLUGIN_FORMAT", "This archive was not created by the deep import/export plugin."));
  }
  return issues;
};
var typeCompatible = (attribute, value) => {
  if (value === null) {
    return true;
  }
  switch (attribute.type) {
    case "boolean":
      return typeof value === "boolean";
    case "integer":
    case "float":
    case "decimal":
      return typeof value === "number";
    case "biginteger":
      return typeof value === "number" || typeof value === "string";
    case "string":
    case "text":
    case "richtext":
    case "email":
    case "uid":
    case "date":
    case "time":
    case "datetime":
      return typeof value === "string";
    case "enumeration":
      return typeof value === "string" && (!attribute.enum || attribute.enum.includes(value));
    case "json":
    case "blocks":
      return true;
    default:
      return true;
  }
};
var walkValue = (value, attribute, path6, source, issues, stats, publishing) => {
  if (attribute.type === "media") {
    const entries = attribute.multiple ? Array.isArray(value) ? value : [] : value === null ? [] : [value];
    entries.forEach((entry) => {
      if (entry === null) {
        return;
      }
      if (!isMediaMarker(entry)) {
        issues.push(issue("error", "INVALID_MEDIA", `Media field ${path6} is not a media reference.`, { path: path6 }));
        return;
      }
      stats.media += 1;
    });
    return;
  }
  if (attribute.type === "relation") {
    if (!isOwningRelation(attribute)) {
      return;
    }
    const entries = isMultiple(attribute) ? Array.isArray(value) ? value : [] : value === null ? [] : [value];
    entries.forEach((entry) => {
      if (entry === null) {
        return;
      }
      if (!isRelationMarker(entry)) {
        issues.push(issue("error", "INVALID_RELATION", `Relation field ${path6} is not a stable reference.`, { path: path6 }));
        return;
      }
      stats.relations += 1;
      if (!source.getModel(entry.$ref.uid)) {
        issues.push(
          issue(
            "error",
            "MISSING_RELATION_TARGET",
            `Unable to resolve relation target ${entry.$ref.uid}. The destination does not define that content type.`,
            { path: path6, uid: entry.$ref.uid, documentId: entry.$ref.documentId }
          )
        );
      }
    });
    return;
  }
  if (attribute.type === "component" && attribute.component) {
    const model = source.getModel(attribute.component);
    if (!model) {
      issues.push(
        issue("error", "MISSING_COMPONENT", `Component ${attribute.component} does not exist on this Strapi instance.`, {
          path: path6,
          component: attribute.component
        })
      );
      return;
    }
    const entries = attribute.repeatable ? Array.isArray(value) ? value : [] : value === null ? [] : [value];
    if (attribute.repeatable && !Array.isArray(value) && value != null) {
      issues.push(issue("error", "INVALID_REPEATABLE", `Repeatable component ${path6} must be an array.`, { path: path6 }));
    }
    entries.forEach((entry, index) => {
      if (!isObject(entry)) {
        issues.push(issue("error", "INVALID_COMPONENT", `Component ${path6}[${index}] must be an object.`, { path: path6 }));
        return;
      }
      stats.components += 1;
      walkData(entry, model, `${path6}[${index}]`, source, issues, stats, publishing);
    });
    return;
  }
  if (attribute.type === "dynamiczone") {
    if (!Array.isArray(value)) {
      issues.push(issue("error", "INVALID_DYNAMIC_ZONE", `Dynamic zone ${path6} must be an array.`, { path: path6 }));
      return;
    }
    const allowed = new Set(attribute.components ?? []);
    value.forEach((entry, index) => {
      if (!isObject(entry) || typeof entry.__component !== "string") {
        issues.push(
          issue("error", "INVALID_DYNAMIC_ZONE", `Dynamic zone item ${path6}[${index}] is missing __component.`, { path: path6 })
        );
        return;
      }
      const componentUid = entry.__component;
      if (!allowed.has(componentUid)) {
        issues.push(
          issue(
            "error",
            "INVALID_DYNAMIC_ZONE_COMPONENT",
            `Component ${componentUid} is not allowed in dynamic zone ${path6}.`,
            { path: path6, component: componentUid }
          )
        );
        return;
      }
      const model = source.getModel(componentUid);
      if (!model) {
        issues.push(issue("error", "MISSING_COMPONENT", `Component ${componentUid} does not exist.`, { path: path6, component: componentUid }));
        return;
      }
      stats.dynamicZones += 1;
      stats.components += 1;
      walkData(entry, model, `${path6}[${index}]`, source, issues, stats, publishing);
    });
    return;
  }
  if ((isScalarAttribute(attribute) || attribute.customField) && !typeCompatible(attribute, value)) {
    issues.push(
      issue("error", "INVALID_TYPE", `Field ${path6} expected ${attribute.type} but received ${Array.isArray(value) ? "array" : typeof value}.`, {
        path: path6,
        type: attribute.type
      })
    );
  }
};
var isMultiple = (attribute) => {
  return attribute.relation === "oneToMany" || attribute.relation === "manyToMany" || attribute.multiple === true;
};
var walkData = (data, model, path6, source, issues, stats, publishing) => {
  for (const [name, value] of Object.entries(data)) {
    if (name === "__component") {
      continue;
    }
    const attribute = model.attributes[name];
    if (!attribute) {
      issues.push(
        issue("warning", "UNKNOWN_FIELD", `Field ${path6}.${name} is not in the destination schema and will be ignored.`, {
          path: `${path6}.${name}`
        })
      );
      continue;
    }
    walkValue(value, attribute, `${path6}.${name}`, source, issues, stats, publishing);
  }
  if (publishing) {
    for (const [name, attribute] of Object.entries(model.attributes)) {
      if (attribute.required && (data[name] === void 0 || data[name] === null || data[name] === "")) {
        issues.push(
          issue("warning", "MISSING_REQUIRED", `Required field ${path6}.${name} is empty. Publishing may be rejected by Strapi.`, {
            path: `${path6}.${name}`
          })
        );
      }
    }
  }
};
var validatePackage = (manifest, documents, schemas, destination, publishing) => {
  const issues = validateManifest(manifest);
  const stats = emptyStats2();
  if (!Array.isArray(documents)) {
    issues.push(issue("error", "MALFORMED_DATA", "data.json must contain a documents array."));
    return { issues, stats, documents: [] };
  }
  const parsed = [];
  const seenTypes = /* @__PURE__ */ new Set();
  documents.forEach((entry, index) => {
    if (!isObject(entry) || typeof entry.uid !== "string" || typeof entry.documentId !== "string" || !Array.isArray(entry.locales)) {
      issues.push(issue("error", "MALFORMED_DOCUMENT", `Document at index ${index} is missing uid, documentId, or locales.`));
      return;
    }
    const model = destination.getModel(entry.uid);
    if (!model || model.modelType !== "contentType") {
      issues.push(
        issue("error", "MISSING_CONTENT_TYPE", `Content type ${entry.uid} does not exist on this Strapi instance.`, {
          uid: entry.uid,
          documentId: entry.documentId
        })
      );
      return;
    }
    const sourceSchema = schemas?.contentTypes?.[entry.uid];
    if (sourceSchema) {
      for (const name of Object.keys(sourceSchema.attributes)) {
        if (!model.attributes[name] && name !== "createdBy" && name !== "updatedBy") {
          issues.push(
            issue("warning", "SCHEMA_FIELD_MISSING", `Destination ${entry.uid} has no field ${name} that the export expected.`, {
              uid: entry.uid,
              field: name
            })
          );
        }
      }
    }
    if (!seenTypes.has(entry.uid)) {
      seenTypes.add(entry.uid);
      stats.contentTypes += 1;
    }
    stats.entries += 1;
    const document = entry;
    if (!isLocalized(model) && document.locales.length > 1) {
      issues.push(
        issue(
          "warning",
          "LOCALE_IGNORED",
          `${entry.uid} is not localized. Only the first locale in the package will be imported.`,
          { uid: entry.uid, documentId: entry.documentId }
        )
      );
    }
    if (!hasDraftAndPublish(model) && document.locales.some((locale) => locale.publicationState === "modified")) {
      issues.push(
        issue("warning", "DRAFT_PUBLISH_DISABLED", `${entry.uid} does not use draft and publish. Publication state will be flattened.`, {
          uid: entry.uid
        })
      );
    }
    document.locales.forEach((locale) => {
      const version = locale.published?.data ?? locale.draft?.data;
      if (!version) {
        issues.push(
          issue("error", "EMPTY_LOCALE", `Document ${entry.documentId} locale ${String(locale.locale)} has no data.`, {
            uid: entry.uid,
            documentId: entry.documentId,
            locale: locale.locale
          })
        );
        return;
      }
      walkData(version, model, document.uid, destination, issues, stats, publishing);
    });
    parsed.push(document);
  });
  return { issues, stats, documents: parsed };
};

// server/src/services/importer/run.ts
var openPackage = async (zipPath, workDir, maxBytes) => {
  const entries = await readZip(zipPath, maxBytes);
  const byName = new Map(entries.map((entry) => [entry.name, entry.data]));
  const manifestBuffer = byName.get(PACKAGE_FILES.manifest);
  const dataBuffer = byName.get(PACKAGE_FILES.data);
  if (!manifestBuffer || !dataBuffer) {
    throw new ImportExportError("The archive is missing manifest.json or data.json.", "MALFORMED_PACKAGE");
  }
  let manifest;
  try {
    manifest = JSON.parse(manifestBuffer.toString("utf8"));
  } catch {
    throw new ImportExportError("manifest.json is not valid JSON.", "MALFORMED_MANIFEST");
  }
  let schemas;
  const schemaBuffer = byName.get(PACKAGE_FILES.schemas);
  if (schemaBuffer) {
    try {
      schemas = JSON.parse(schemaBuffer.toString("utf8"));
    } catch {
      throw new ImportExportError("schemas.json is not valid JSON.", "MALFORMED_SCHEMA");
    }
  }
  const mediaDir = path4.join(workDir, "media");
  await mkdir3(mediaDir, { recursive: true });
  for (const [name, data] of byName) {
    if (!name.startsWith("media/")) {
      continue;
    }
    await writeFile3(path4.join(workDir, name), data);
  }
  const dataPath = path4.join(workDir, PACKAGE_FILES.data);
  await writeFile3(dataPath, dataBuffer);
  const documents = [];
  await readDocumentArray(dataPath, (document) => {
    documents.push(document);
  });
  return { manifest, documents, schemas, mediaDir: workDir, issues: [] };
};
var mediaKey = (media) => media.sha256 || media.key || media.hash || `${media.name}:${media.sizeInBytes ?? media.size ?? ""}`;
var runImport = async (opened, options, runtime, onProgress) => {
  const validation = validatePackage(opened.manifest, opened.documents, opened.schemas, runtime.source, options.publishMode !== "draft");
  const prepared = await prepareImport(validation.documents, runtime.source, options, runtime.ports);
  const issues = [...validation.issues, ...prepared.issues];
  const blocked = issues.some((item) => item.level === "error") || prepared.blocked;
  const preview = {
    stats: validation.stats,
    conflicts: prepared.conflicts,
    issues,
    blocked
  };
  if (options.dryRun || blocked) {
    return { preview };
  }
  const mediaIds = /* @__PURE__ */ new Map();
  const uploadedIds = [];
  const media = prepared.media;
  for (const [index, ref] of media.entries()) {
    const candidates = await runtime.findMediaCandidates(ref);
    const matched = matchMedia(ref, candidates);
    if (matched) {
      for (const key of [ref.sha256, ref.key, ref.hash, mediaKey(ref)]) {
        if (key) {
          mediaIds.set(key, matched.id);
        }
      }
      onProgress?.("media", index + 1, media.length);
      continue;
    }
    if (!ref.key || !opened.manifest.includeMedia) {
      issues.push(
        issue("warning", "MISSING_MEDIA", `Media "${ref.name}" was not in the archive and no matching file exists in this library.`, {
          name: ref.name,
          hash: ref.hash
        })
      );
      continue;
    }
    const filePath = path4.join(opened.mediaDir, ref.key);
    const bytes = await readFile2(filePath);
    const sha256 = createHash3("sha256").update(bytes).digest("hex");
    if (ref.sha256 && ref.sha256 !== sha256) {
      throw new ImportExportError(`Media file ${ref.key} does not match its recorded checksum.`, "MEDIA_CHECKSUM", {
        key: ref.key
      });
    }
    ref.sha256 = sha256;
    const again = matchMedia(ref, candidates);
    if (again) {
      mediaIds.set(sha256, again.id);
      mediaIds.set(mediaKey(ref), again.id);
      if (ref.key) {
        mediaIds.set(ref.key, again.id);
      }
      continue;
    }
    const stored = await runtime.uploadMedia(ref, bytes);
    uploadedIds.push(stored.id);
    await runtime.rememberMedia(sha256, stored);
    for (const key of [sha256, ref.key, ref.hash, mediaKey(ref)]) {
      if (key) {
        mediaIds.set(key, stored.id);
      }
    }
    onProgress?.("media", index + 1, media.length);
  }
  const execution = await executeImport(validation.documents, runtime.source, options, runtime.ports, mediaIds, onProgress);
  if (execution.rollback.attempted) {
    for (const id of uploadedIds) {
      try {
        await runtime.deleteMedia(id);
      } catch (error) {
        execution.rollback.completed = false;
        execution.rollback.failures.push(
          `Could not delete uploaded media ${id}: ${error instanceof Error ? error.message : "unknown error"}`
        );
      }
    }
  }
  execution.issues.push(...issues.filter((item) => item.level === "warning"));
  return { preview, execution };
};
var removeWorkDir = async (directory) => {
  await rm2(directory, { recursive: true, force: true });
};

// server/src/services/transfer.ts
var JOB_UID = `plugin::${PLUGIN_ID}.job`;
var toPublic = (job) => ({
  documentId: String(job.documentId),
  operation: String(job.operation),
  state: String(job.state),
  startedAt: job.startedAt ?? null,
  finishedAt: job.finishedAt ?? null,
  summary: job.summary ?? null,
  progress: job.progress ?? emptyProgress(),
  errors: job.errors ?? [],
  warnings: job.warnings ?? [],
  rollback: job.rollback ?? null,
  downloadable: Boolean(job.archivePath) && job.state === "completed" && job.operation === "export",
  filename: typeof job.archivePath === "string" ? path5.basename(job.archivePath) : null
});
var emptyProgress = () => ({
  contentTypes: { done: 0, total: 0 },
  entries: { done: 0, total: 0 },
  components: { done: 0, total: 0 },
  media: { done: 0, total: 0 },
  relations: { done: 0, total: 0 }
});
var assertSafeId = (value) => {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(value)) {
    throw new ImportExportError("The job id is not valid.", "INVALID_ID");
  }
  return value;
};
var createTransferService = (strapi) => {
  const jobs = () => strapi.documents(JOB_UID);
  const progressByJob = /* @__PURE__ */ new Map();
  const updateProgress = async (documentId, stage, done, total) => {
    const progress = progressByJob.get(documentId) ?? emptyProgress();
    progressByJob.set(documentId, progress);
    const bucket = progress[stage];
    if (bucket) {
      bucket.done = done;
      bucket.total = Math.max(total, done);
    }
    await jobs().update({
      documentId,
      data: {
        progress: {
          contentTypes: { ...progress.contentTypes },
          entries: { ...progress.entries },
          components: { ...progress.components },
          media: { ...progress.media },
          relations: { ...progress.relations }
        }
      }
    });
  };
  return {
    async contentTypes() {
      const source = schemaSourceFromStrapi(strapi);
      const localeInfo = await listLocales(strapi);
      return source.contentTypes().map((model) => ({
        uid: model.uid,
        displayName: model.displayName ?? model.uid,
        kind: model.kind ?? "collectionType",
        draftAndPublish: Boolean(model.options?.draftAndPublish),
        localized: Boolean(model.pluginOptions?.i18n?.localized),
        locales: model.pluginOptions?.i18n?.localized ? localeInfo.codes : [],
        defaultLocale: localeInfo.defaultLocale,
        labelFields: labelFields(model)
      }));
    },
    async entries(uid, page, query) {
      if (isBlockedUid(uid)) {
        throw new ImportExportError("That content type cannot be exported.", "BLOCKED_CONTENT_TYPE", { uid });
      }
      const source = schemaSourceFromStrapi(strapi);
      const model = source.getModel(uid);
      if (!model) {
        throw new ImportExportError(`Content type ${uid} does not exist.`, "MISSING_CONTENT_TYPE", { uid });
      }
      const fields = labelFields(model);
      const filters = query ? { $or: fields.map((field) => ({ [field]: { $containsi: query } })) } : void 0;
      const rows = await findPage(strapi, source, {
        uid,
        status: "draft",
        locale: null,
        page,
        pageSize: 25,
        filters,
        populate: void 0
      });
      return rows.map((row) => {
        const label = fields.map((field) => row[field]).find((value) => typeof value === "string" && value) ?? row.documentId;
        return {
          documentId: row.documentId,
          label,
          locale: row.locale ?? null
        };
      });
    },
    async listJobs(page = 1) {
      const result = await jobs().findMany({
        sort: ["createdAt:desc"],
        pagination: { page, pageSize: 25 }
      });
      const rows = Array.isArray(result) ? result : [];
      return rows.map((row) => toPublic(row));
    },
    async findJob(documentId) {
      const job = await jobs().findOne({ documentId: assertSafeId(documentId) });
      if (!job) {
        throw new ImportExportError("Job not found.", "NOT_FOUND");
      }
      return toPublic(job);
    },
    async download(documentId) {
      const job = await jobs().findOne({ documentId: assertSafeId(documentId) });
      if (!job?.archivePath || typeof job.archivePath !== "string") {
        throw new ImportExportError("This job has no archive to download.", "NO_ARCHIVE");
      }
      const root = path5.resolve(storageRoot(strapi));
      const archive = path5.resolve(job.archivePath);
      if (!archive.startsWith(root + path5.sep)) {
        throw new ImportExportError("Archive path is outside the plugin storage directory.", "UNSAFE_PATH");
      }
      await stat3(archive);
      return {
        stream: createReadStream3(archive),
        filename: path5.basename(archive)
      };
    },
    startExport(selection) {
      return this.enqueue("export", selection, async (documentId) => {
        const source = schemaSourceFromStrapi(strapi);
        const config2 = readPluginConfig(strapi);
        const directory = path5.join(storageRoot(strapi), "exports", documentId);
        const version = strapi.config.get("info.strapi", "5.0.0");
        const { filePath, manifest } = await runExport(selection, directory, {
          source,
          strapiVersion: String(version),
          environment: String(strapi.config.get("environment", "development")),
          maxDepth: config2.maxRecursionDepth,
          batchSize: config2.batchSize,
          listLocales: () => listLocales(strapi),
          findPage: (input) => findPage(strapi, source, input),
          readMedia: (file) => readUploadBytes(strapi, file),
          onProgress: (stage, done, total) => updateProgress(documentId, stage, done, total)
        });
        return {
          summary: manifest,
          archivePath: filePath,
          warnings: [],
          errors: []
        };
      });
    },
    async validateUpload(filepath, originalName, size) {
      const config2 = readPluginConfig(strapi);
      if (!originalName.toLowerCase().endsWith(".zip")) {
        throw new ImportExportError("Only .zip export packages can be imported.", "INVALID_FILE_TYPE");
      }
      if (size > config2.maxArchiveBytes) {
        throw new ImportExportError(`The archive exceeds the ${config2.maxArchiveBytes} byte limit.`, "ARCHIVE_TOO_LARGE");
      }
      const header = await readHeader(filepath);
      if (header.toString("utf8", 0, 2) !== "PK") {
        throw new ImportExportError("Uploaded file is not a ZIP archive.", "INVALID_ARCHIVE");
      }
      const token = randomUUID();
      const pending = path5.join(storageRoot(strapi), "pending");
      await mkdir4(pending, { recursive: true });
      const stored = path5.join(pending, `${token}.zip`);
      await copyFile(filepath, stored);
      const work = path5.join(pending, token);
      const opened = await openPackage(stored, work, config2.maxArchiveBytes);
      const source = schemaSourceFromStrapi(strapi);
      const ports = createWritePorts(strapi);
      const options = defaultImportOptions(strapi);
      options.dryRun = true;
      const result = await runImport(opened, options, {
        source,
        ports,
        publishing: options.publishMode !== "draft",
        findMediaCandidates: (media) => findMediaCandidates(strapi, media),
        rememberMedia: (sha, media) => rememberMedia(strapi, sha, media),
        uploadMedia: (media, bytes) => uploadMediaFile(strapi, media, bytes),
        deleteMedia: (id) => deleteMedia(strapi, id)
      });
      await removeWorkDir(work);
      return { token, preview: result.preview };
    },
    startImport(token, options) {
      if (!/^[0-9a-f-]{36}$/.test(token)) {
        throw new ImportExportError("The upload token is not valid.", "INVALID_TOKEN");
      }
      const zipPath = path5.join(storageRoot(strapi), "pending", `${token}.zip`);
      return this.enqueue("import", { ...options, token: "redacted" }, async (documentId) => {
        const config2 = readPluginConfig(strapi);
        const work = path5.join(storageRoot(strapi), "imports", documentId);
        const opened = await openPackage(zipPath, work, config2.maxArchiveBytes);
        const result = await runImport(
          opened,
          { ...options, dryRun: false },
          {
            source: schemaSourceFromStrapi(strapi),
            ports: createWritePorts(strapi),
            publishing: options.publishMode !== "draft",
            findMediaCandidates: (media) => findMediaCandidates(strapi, media),
            rememberMedia: (sha, media) => rememberMedia(strapi, sha, media),
            uploadMedia: (media, bytes) => uploadMediaFile(strapi, media, bytes),
            deleteMedia: (id) => deleteMedia(strapi, id)
          },
          (stage, done, total) => updateProgress(documentId, stage, done, total)
        );
        await removeWorkDir(work);
        if (result.preview.blocked || result.execution?.rollback.attempted) {
          const error = result.execution?.issues.find((item) => item.level === "error");
          throw new ImportExportError(error?.message ?? "Import did not complete.", "IMPORT_FAILED", {
            preview: result.preview,
            execution: result.execution
          });
        }
        return {
          summary: {
            ...result.execution,
            stats: result.preview.stats
          },
          warnings: result.preview.issues.filter((item) => item.level === "warning"),
          errors: [],
          rollback: result.execution?.rollback
        };
      });
    },
    async enqueue(operation, options, task) {
      const created = await jobs().create({
        data: {
          operation,
          state: "queued",
          options,
          progress: emptyProgress(),
          errors: [],
          warnings: []
        }
      });
      const documentId = String(created.documentId);
      progressByJob.set(documentId, emptyProgress());
      setImmediate(() => {
        this.runTask(documentId, task).catch((error) => {
          strapi.log.error(error instanceof Error ? error.message : "Import/export job failed");
        });
      });
      return toPublic({ ...created, documentId, operation, state: "queued" });
    },
    async runTask(documentId, task) {
      const startedAt = (/* @__PURE__ */ new Date()).toISOString();
      await jobs().update({ documentId, data: { state: "running", startedAt } });
      try {
        const result = await task(documentId);
        await jobs().update({
          documentId,
          data: {
            state: "completed",
            finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
            summary: result.summary,
            warnings: result.warnings,
            errors: result.errors,
            rollback: result.rollback ?? null,
            archivePath: result.archivePath ?? null
          }
        });
      } catch (error) {
        const details = error instanceof ImportExportError ? error.details : {};
        const execution = details.execution ?? null;
        await jobs().update({
          documentId,
          data: {
            state: "failed",
            finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
            errors: [
              {
                message: error instanceof Error ? error.message : "Import/export failed.",
                code: error instanceof ImportExportError ? error.code : "FAILED"
              }
            ],
            summary: execution,
            rollback: execution?.rollback ?? { attempted: false, completed: false, failures: [] }
          }
        });
      }
    }
  };
};
var readHeader = async (filePath) => {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(4);
    await handle.read(buffer, 0, 4, 0);
    return buffer;
  } finally {
    await handle.close();
  }
};
var defaultImportOptions = (strapi) => {
  const config2 = readPluginConfig(strapi);
  return {
    conflictStrategy: config2.defaultConflictStrategy,
    publishMode: "preserve",
    unresolvedRelations: config2.unresolvedRelations,
    dryRun: true
  };
};
var parseImportOptions = (value, fallback) => {
  const source = value && typeof value === "object" ? value : {};
  const strategy = String(source.conflictStrategy ?? fallback.conflictStrategy);
  const publishMode = String(source.publishMode ?? fallback.publishMode);
  const unresolved = String(source.unresolvedRelations ?? fallback.unresolvedRelations);
  if (!["skip", "update", "create", "ask"].includes(strategy)) {
    throw new ImportExportError("Conflict strategy is invalid.", "INVALID_OPTIONS");
  }
  if (!["draft", "publish", "preserve"].includes(publishMode)) {
    throw new ImportExportError("Publish mode is invalid.", "INVALID_OPTIONS");
  }
  if (!["error", "warn"].includes(unresolved)) {
    throw new ImportExportError("Unresolved relation policy is invalid.", "INVALID_OPTIONS");
  }
  return {
    conflictStrategy: strategy,
    publishMode,
    unresolvedRelations: unresolved,
    locales: Array.isArray(source.locales) ? source.locales.map(String) : void 0,
    localeMap: source.localeMap && typeof source.localeMap === "object" ? source.localeMap : void 0,
    decisions: source.decisions && typeof source.decisions === "object" ? source.decisions : void 0,
    dryRun: false
  };
};
var parseExportSelection = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const contentTypes = Array.isArray(source.contentTypes) ? source.contentTypes.map(String) : [];
  if (contentTypes.some((uid) => isBlockedUid(uid) || !uid.includes("::"))) {
    throw new ImportExportError("One or more content types cannot be exported.", "BLOCKED_CONTENT_TYPE");
  }
  const documentIds = Array.isArray(source.documentIds) ? source.documentIds.map(String).slice(0, 500) : void 0;
  if (documentIds?.some((id) => !/^[A-Za-z0-9_-]+$/.test(id))) {
    throw new ImportExportError("Document ids contain unsupported characters.", "INVALID_ID");
  }
  let filters;
  if (source.filters && typeof source.filters === "object") {
    filters = JSON.parse(JSON.stringify(source.filters));
  }
  const status = String(source.status ?? "both");
  if (!["draft", "published", "both"].includes(status)) {
    throw new ImportExportError("Export status must be draft, published, or both.", "INVALID_OPTIONS");
  }
  return {
    contentTypes,
    documentIds,
    filters,
    includeMedia: source.includeMedia !== false,
    includeRelations: source.includeRelations !== false,
    locales: Array.isArray(source.locales) ? source.locales.map(String) : void 0,
    status,
    archiveName: typeof source.archiveName === "string" ? source.archiveName.trim().slice(0, 80) : void 0
  };
};

// server/src/controllers/transfer.ts
var serviceOf = (strapi) => {
  return strapi.plugin(PLUGIN_ID).service("transfer");
};
var fail = (ctx, error) => {
  if (error instanceof ImportExportError) {
    const status = error.code === "NOT_FOUND" || error.code === "NO_ARCHIVE" ? "notFound" : "badRequest";
    if (status === "notFound") {
      ctx.notFound(error.message);
      return;
    }
    ctx.badRequest(error.message, { code: error.code, ...error.details });
    return;
  }
  ctx.badRequest(error instanceof Error ? error.message : "Import/export request failed.");
};
var uploadedFile = (ctx) => {
  const files = ctx.request.files ?? {};
  const candidate = files.file ?? files.files;
  const file = Array.isArray(candidate) ? candidate[0] : candidate;
  if (!file) {
    throw new ImportExportError("Choose a .zip export package to upload.", "MISSING_FILE");
  }
  const filepath = file.filepath || file.path;
  if (!filepath) {
    throw new ImportExportError("The uploaded file could not be read.", "MISSING_FILE");
  }
  return {
    filepath,
    name: file.originalFilename || file.name || "package.zip",
    size: Number(file.size ?? 0),
    mime: file.mimetype || file.type || ""
  };
};
var allowedMime = (mime, name) => {
  if (!name.toLowerCase().endsWith(".zip")) {
    return false;
  }
  return mime === "" || mime === "application/zip" || mime === "application/x-zip-compressed" || mime === "application/octet-stream";
};
var transfer_default = ({ strapi }) => ({
  async contentTypes(ctx) {
    try {
      ctx.body = { data: await serviceOf(strapi).contentTypes() };
    } catch (error) {
      fail(ctx, error);
    }
  },
  async entries(ctx) {
    try {
      const urlQuery = ctx.query ?? {};
      ctx.body = {
        data: await serviceOf(strapi).entries(String(urlQuery.uid ?? ""), Number(urlQuery.page ?? 1), String(urlQuery.q ?? ""))
      };
    } catch (error) {
      fail(ctx, error);
    }
  },
  async exportStart(ctx) {
    try {
      ctx.body = { data: await serviceOf(strapi).startExport(parseExportSelection(ctx.request.body)) };
    } catch (error) {
      fail(ctx, error);
    }
  },
  async validate(ctx) {
    try {
      const file = uploadedFile(ctx);
      if (!allowedMime(file.mime, file.name)) {
        throw new ImportExportError("Only ZIP archives created by this plugin are accepted.", "INVALID_FILE_TYPE");
      }
      ctx.body = { data: await serviceOf(strapi).validateUpload(file.filepath, file.name, file.size) };
    } catch (error) {
      fail(ctx, error);
    }
  },
  async importStart(ctx) {
    try {
      const body = ctx.request.body ?? {};
      if (!body.token) {
        throw new ImportExportError("Validate a package before importing it.", "MISSING_TOKEN");
      }
      const config2 = readPluginConfig(strapi);
      const fallback = {
        conflictStrategy: config2.defaultConflictStrategy,
        publishMode: "preserve",
        unresolvedRelations: config2.unresolvedRelations
      };
      ctx.body = { data: await serviceOf(strapi).startImport(body.token, parseImportOptions(body.options, fallback)) };
    } catch (error) {
      fail(ctx, error);
    }
  },
  async history(ctx) {
    try {
      const urlQuery = ctx.query ?? {};
      ctx.body = { data: await serviceOf(strapi).listJobs(Number(urlQuery.page ?? 1)) };
    } catch (error) {
      fail(ctx, error);
    }
  },
  async status(ctx) {
    try {
      ctx.body = { data: await serviceOf(strapi).findJob(String(ctx.params.id)) };
    } catch (error) {
      fail(ctx, error);
    }
  },
  async download(ctx) {
    try {
      const file = await serviceOf(strapi).download(String(ctx.params.id));
      ctx.set("Content-Type", "application/zip");
      ctx.set("Content-Disposition", `attachment; filename="${file.filename.replace(/"/g, "")}"`);
      ctx.body = file.stream;
    } catch (error) {
      fail(ctx, error);
    }
  }
});

// server/src/controllers/index.ts
var controllers_default = {
  transfer: transfer_default
};

// server/src/destroy.ts
var destroy = () => void 0;
var destroy_default = destroy;

// server/src/policies/is-authenticated-admin.ts
var isAuthenticatedAdmin = (policyContext) => {
  const user = policyContext.state?.user;
  if (!user || user.isActive === false) {
    return false;
  }
  return true;
};
var is_authenticated_admin_default = isAuthenticatedAdmin;

// server/src/policies/index.ts
var policies_default = {
  "is-authenticated-admin": is_authenticated_admin_default
};

// server/src/register.ts
var register = () => void 0;
var register_default = register;

// server/src/routes/index.ts
var auth = (action) => ({
  policies: [
    "plugin::deep-import-export.is-authenticated-admin",
    "admin::isAuthenticatedAdmin",
    {
      name: "admin::hasPermissions",
      config: {
        actions: [`plugin::deep-import-export.${action}`]
      }
    }
  ]
});
var routes = {
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
      { method: "GET", path: "/jobs/:id/download", handler: "transfer.download", config: auth("export") }
    ]
  }
};
var routes_default = routes;

// server/src/services/index.ts
var services_default = {
  transfer: ({ strapi }) => createTransferService(strapi)
};

// server/src/index.ts
var plugin = () => ({
  register: register_default,
  bootstrap: bootstrap_default,
  destroy: destroy_default,
  config: config_default,
  controllers: controllers_default,
  routes: routes_default,
  services: services_default,
  policies: policies_default,
  contentTypes: content_types_default
});
var index_default = plugin;
export {
  index_default as default
};
//# sourceMappingURL=index.mjs.map
