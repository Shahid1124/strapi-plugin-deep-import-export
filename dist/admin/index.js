var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// admin/src/pluginId.ts
var PLUGIN_ID;
var init_pluginId = __esm({
  "admin/src/pluginId.ts"() {
    PLUGIN_ID = "deep-import-export";
  }
});

// admin/src/components/Panel.tsx
var import_design_system, import_jsx_runtime, Panel;
var init_Panel = __esm({
  "admin/src/components/Panel.tsx"() {
    import_design_system = require("@strapi/design-system");
    import_jsx_runtime = require("react/jsx-runtime");
    Panel = ({ title, hint, children }) => {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_design_system.Box, { padding: 5, background: "neutral0", hasRadius: true, shadow: "filterShadow", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_design_system.Flex, { direction: "column", alignItems: "stretch", gap: 4, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_design_system.Box, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_design_system.Typography, { variant: "delta", children: title }),
          hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_design_system.Box, { marginTop: 1, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_design_system.Typography, { variant: "pi", textColor: "neutral600", children: hint }) }) : null
        ] }),
        children
      ] }) });
    };
  }
});

// admin/src/components/ProgressList.tsx
var import_design_system2, import_jsx_runtime2, LABELS, percent, ProgressList;
var init_ProgressList = __esm({
  "admin/src/components/ProgressList.tsx"() {
    import_design_system2 = require("@strapi/design-system");
    import_jsx_runtime2 = require("react/jsx-runtime");
    LABELS = {
      contentTypes: "Content Types",
      entries: "Entries",
      components: "Components",
      media: "Media",
      relations: "Relations"
    };
    percent = (bucket) => {
      if (!bucket || bucket.total <= 0) {
        return 0;
      }
      return Math.min(100, Math.round(bucket.done / bucket.total * 100));
    };
    ProgressList = ({ progress }) => {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_design_system2.Flex, { direction: "column", alignItems: "stretch", gap: 3, children: Object.keys(LABELS).map((key) => {
        const value = percent(progress?.[key]);
        return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_design_system2.Flex, { direction: "column", alignItems: "stretch", gap: 1, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_design_system2.Flex, { justifyContent: "space-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_design_system2.Typography, { variant: "pi", fontWeight: "bold", children: LABELS[key] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_design_system2.Typography, { variant: "pi", children: [
              value,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_design_system2.Box, { background: "neutral200", hasRadius: true, style: { height: 8, overflow: "hidden", width: "100%" }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            import_design_system2.Box,
            {
              background: "success600",
              hasRadius: true,
              role: "progressbar",
              "aria-valuenow": value,
              "aria-valuemin": 0,
              "aria-valuemax": 100,
              "aria-label": LABELS[key],
              style: { height: "100%", width: `${value}%` }
            }
          ) })
        ] }, key);
      }) });
    };
  }
});

// admin/src/components/SelectField.tsx
var import_design_system3, import_jsx_runtime3, SelectField;
var init_SelectField = __esm({
  "admin/src/components/SelectField.tsx"() {
    import_design_system3 = require("@strapi/design-system");
    import_jsx_runtime3 = require("react/jsx-runtime");
    SelectField = ({
      label,
      name,
      value,
      onChange,
      children
    }) => {
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_design_system3.Field.Root, { name, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_design_system3.Field.Label, { children: label }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_design_system3.SingleSelect, { value: value || null, onChange: (next) => onChange(String(next)), children })
      ] });
    };
  }
});

// admin/src/services/api.ts
var base, api, downloadArchive;
var init_api = __esm({
  "admin/src/services/api.ts"() {
    init_pluginId();
    base = `/${PLUGIN_ID}`;
    api = (client) => ({
      contentTypes: async () => (await client.get(`${base}/content-types`)).data.data,
      entries: async (uid, q) => (await client.get(`${base}/entries`, { params: { uid, q, page: 1 } })).data.data,
      startExport: async (body) => (await client.post(`${base}/export`, body)).data.data,
      validate: async (file) => {
        const body = new FormData();
        body.append("file", file);
        return (await client.post(`${base}/import/validate`, body)).data.data;
      },
      startImport: async (token, options) => (await client.post(`${base}/import`, { token, options })).data.data,
      history: async () => (await client.get(`${base}/history`)).data.data,
      deleteJob: async (id) => (await client.del(`${base}/jobs/${id}`)).data.data,
      clearHistory: async () => (await client.del(`${base}/history`)).data.data,
      status: async (id) => (await client.get(`${base}/status/${id}`)).data.data
    });
    downloadArchive = async (jobId, filename) => {
      const raw = localStorage.getItem("jwtToken");
      const token = raw ? JSON.parse(raw) : "";
      const backend = window.strapi?.backendURL ?? "";
      const response = await fetch(`${backend}/${PLUGIN_ID}/jobs/${jobId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error("The archive is not ready to download.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };
  }
});

// admin/src/hooks/useJob.ts
var React, import_admin, useJob;
var init_useJob = __esm({
  "admin/src/hooks/useJob.ts"() {
    React = __toESM(require("react"));
    import_admin = require("@strapi/strapi/admin");
    init_api();
    useJob = (id) => {
      const client = (0, import_admin.useFetchClient)();
      const clientRef = React.useRef(client);
      clientRef.current = client;
      const [job, setJob] = React.useState(null);
      const [error, setError] = React.useState("");
      React.useEffect(() => {
        if (!id) {
          setJob(null);
          return void 0;
        }
        let stopped = false;
        let timer = 0;
        const load = async () => {
          try {
            const next = await api(clientRef.current).status(id);
            if (stopped) {
              return;
            }
            setJob(next);
            setError("");
            if (next.state === "completed" || next.state === "failed") {
              window.clearInterval(timer);
            }
          } catch (cause) {
            if (!stopped) {
              setError(cause instanceof Error ? cause.message : "Could not read job status.");
            }
          }
        };
        void load();
        timer = window.setInterval(() => {
          void load();
        }, 1e3);
        return () => {
          stopped = true;
          window.clearInterval(timer);
        };
      }, [id]);
      return { job, error };
    };
  }
});

// admin/src/pages/ExportPage.tsx
var React2, import_design_system4, import_admin2, import_jsx_runtime4, ExportPage;
var init_ExportPage = __esm({
  "admin/src/pages/ExportPage.tsx"() {
    React2 = __toESM(require("react"));
    import_design_system4 = require("@strapi/design-system");
    import_admin2 = require("@strapi/strapi/admin");
    init_Panel();
    init_ProgressList();
    init_SelectField();
    init_useJob();
    init_api();
    import_jsx_runtime4 = require("react/jsx-runtime");
    ExportPage = () => {
      const client = (0, import_admin2.useFetchClient)();
      const { toggleNotification } = (0, import_admin2.useNotification)();
      const [types, setTypes] = React2.useState([]);
      const [uid, setUid] = React2.useState("");
      const [entries, setEntries] = React2.useState([]);
      const [selected, setSelected] = React2.useState([]);
      const [allEntries, setAllEntries] = React2.useState(true);
      const [entryQuery, setEntryQuery] = React2.useState("");
      const [includeMedia, setIncludeMedia] = React2.useState(true);
      const [allLocales, setAllLocales] = React2.useState(true);
      const [locales, setLocales] = React2.useState([]);
      const [includeRelations, setIncludeRelations] = React2.useState(true);
      const [status, setStatus] = React2.useState("both");
      const [filters, setFilters] = React2.useState("");
      const [fileName, setFileName] = React2.useState("");
      const [jobId, setJobId] = React2.useState(null);
      const [error, setError] = React2.useState("");
      const { job } = useJob(jobId);
      const selectedType = types.find((type) => type.uid === uid);
      const suggestedName = React2.useMemo(() => {
        const typeName = selectedType?.displayName ?? "export";
        const single = !allEntries && selected.length === 1 ? entries.find((entry) => entry.documentId === selected[0])?.label : void 0;
        const raw = single ? `${typeName}-${single}` : typeName;
        return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "export";
      }, [allEntries, entries, selected, selectedType?.displayName]);
      const exportDisabled = !uid || job?.state === "running" || !allEntries && selectedType?.kind === "collectionType" && selected.length === 0 || Boolean(selectedType?.localized) && !allLocales && locales.length === 0;
      React2.useEffect(() => {
        api(client).contentTypes().then((next) => {
          setTypes(next);
          if (next[0]) {
            setUid(next[0].uid);
          }
        }).catch((cause) => setError(cause.message));
      }, [client]);
      React2.useEffect(() => {
        setAllLocales(true);
        setLocales([]);
        setSelected([]);
        setFileName("");
      }, [uid]);
      React2.useEffect(() => {
        if (!uid || selectedType?.kind === "singleType") {
          setEntries([]);
          return;
        }
        api(client).entries(uid, entryQuery).then(setEntries).catch((cause) => setError(cause.message));
      }, [client, entryQuery, selectedType?.kind, uid]);
      const onExport = async () => {
        setError("");
        try {
          let parsedFilters;
          if (filters.trim()) {
            parsedFilters = JSON.parse(filters);
          }
          const created = await api(client).startExport({
            contentTypes: [uid],
            documentIds: allEntries || selectedType?.kind === "singleType" ? void 0 : selected,
            includeMedia,
            includeRelations,
            status,
            filters: parsedFilters,
            archiveName: fileName.trim() || suggestedName,
            locales: selectedType?.localized && !allLocales ? locales : void 0
          });
          setJobId(created.documentId);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Export could not be started.");
        }
      };
      React2.useEffect(() => {
        if (job?.state === "completed") {
          toggleNotification({ type: "success", message: "Export completed." });
        }
        if (job?.state === "failed") {
          toggleNotification({ type: "danger", message: job.errors?.[0]?.message ?? "Export failed." });
        }
      }, [job?.state, job?.errors, toggleNotification]);
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Flex, { direction: "column", alignItems: "stretch", gap: 4, children: [
        error ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Alert, { closeLabel: "Close", title: "Export", variant: "danger", children: error }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          Panel,
          {
            title: "Content",
            hint: "The list comes from this Strapi instance. Components, dynamic zones, and nesting are read from the live schema.",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SelectField, { label: "Content type", name: "content-type", value: uid, onChange: setUid, children: types.map((type) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.SingleSelectOption, { value: type.uid, children: type.displayName }, type.uid)) }),
              selectedType ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Flex, { direction: "column", alignItems: "flex-start", gap: 2, children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Flex, { gap: 2, wrap: "wrap", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Badge, { children: selectedType.kind === "singleType" ? "Single type" : "Collection type" }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Badge, { active: selectedType.draftAndPublish, children: selectedType.draftAndPublish ? "Draft and publish" : "No versions" }),
                  selectedType.localized ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Badge, { active: true, children: "Localized" }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Badge, { children: "Not localized" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Typography, { variant: "pi", textColor: "neutral600", children: selectedType.uid })
              ] }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(SelectField, { label: "Versions", name: "versions", value: status, onChange: (value) => setStatus(value), children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.SingleSelectOption, { value: "both", children: "Draft and published" }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.SingleSelectOption, { value: "draft", children: "Draft only" }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.SingleSelectOption, { value: "published", children: "Published only" })
              ] }),
              selectedType?.localized && selectedType.locales?.length ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Box, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Checkbox, { checked: allLocales, onCheckedChange: (value) => setAllLocales(value === true), children: "All locales" }),
                !allLocales ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Flex, { direction: "column", alignItems: "flex-start", gap: 2, marginTop: 2, children: selectedType.locales.map((code) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                  import_design_system4.Checkbox,
                  {
                    checked: locales.includes(code),
                    onCheckedChange: (value) => {
                      setLocales((current) => value === true ? [...current, code] : current.filter((item) => item !== code));
                    },
                    children: [
                      code,
                      code === selectedType.defaultLocale ? " (default)" : ""
                    ]
                  },
                  code
                )) }) : null
              ] }) : null,
              selectedType?.kind === "collectionType" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Checkbox, { checked: allEntries, onCheckedChange: (value) => setAllEntries(value === true), children: "All entries" }) : null,
              !allEntries && selectedType?.kind === "collectionType" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Box, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Field.Root, { name: "entry-search", hint: "Search matches the title, name, or slug fields on this content type.", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Field.Label, { children: "Find an entry" }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                    import_design_system4.TextInput,
                    {
                      placeholder: "Title or slug",
                      value: entryQuery,
                      onChange: (event) => setEntryQuery(event.target.value)
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Field.Hint, {})
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Box, { marginTop: 3, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                  import_design_system4.Checkbox,
                  {
                    checked: entries.length > 0 && entries.every((entry) => selected.includes(entry.documentId)),
                    onCheckedChange: (value) => {
                      const shown = entries.map((entry) => entry.documentId);
                      setSelected((current) => value === true ? [.../* @__PURE__ */ new Set([...current, ...shown])] : current.filter((id) => !shown.includes(id)));
                    },
                    children: [
                      "Select shown (",
                      entries.length,
                      ")"
                    ]
                  }
                ) }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Box, { marginTop: 3, padding: 3, background: "neutral100", hasRadius: true, style: { maxHeight: 280, overflow: "auto" }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Flex, { direction: "column", alignItems: "flex-start", gap: 2, children: [
                  entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Typography, { variant: "pi", textColor: "neutral600", children: "No entries match this search." }) : null,
                  entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                    import_design_system4.Checkbox,
                    {
                      checked: selected.includes(entry.documentId),
                      onCheckedChange: (value) => {
                        setSelected((current) => value === true ? [...current, entry.documentId] : current.filter((id) => id !== entry.documentId));
                      },
                      children: String(entry.label)
                    },
                    entry.documentId
                  ))
                ] }) })
              ] }) : null
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(Panel, { title: "Package", hint: "Media and relations are included only when this content type actually has those fields.", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Flex, { gap: 6, wrap: "wrap", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Checkbox, { checked: includeMedia, onCheckedChange: (value) => setIncludeMedia(value === true), children: "Include media files" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Checkbox, { checked: includeRelations, onCheckedChange: (value) => setIncludeRelations(value === true), children: "Include relations" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Field.Root, { name: "file-name", hint: "Leave this empty to use the name suggested from the content type or selected entry.", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Field.Label, { children: "File name" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              import_design_system4.TextInput,
              {
                placeholder: suggestedName,
                value: fileName,
                onChange: (event) => setFileName(event.target.value)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Field.Hint, {})
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Accordion.Root, { collapsible: true, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Accordion.Item, { value: "filters", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Accordion.Header, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Accordion.Trigger, { children: "Optional filters" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Accordion.Content, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Box, { paddingTop: 3, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Field.Root, { name: "filters", hint: "Strapi document filters as JSON. Leave empty to export the selection above.", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Field.Label, { children: "Filters" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Textarea, { value: filters, onChange: (event) => setFilters(event.target.value) }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Field.Hint, {})
            ] }) }) })
          ] }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(Panel, { title: "Ready to export", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_design_system4.Typography, { children: [
            selectedType?.kind === "singleType" || allEntries ? `Every ${selectedType?.displayName ?? "entry"} in this type.` : `${selected.length} selected ${selected.length === 1 ? "entry" : "entries"}.`,
            " ",
            "File: ",
            fileName.trim() || suggestedName,
            ".zip",
            selectedType?.localized && !allLocales ? ` Locales: ${locales.join(", ") || "none"}.` : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Box, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Button, { onClick: () => void onExport(), disabled: exportDisabled, children: "Export" }) }),
          job ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Divider, {}),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Typography, { variant: "delta", children: job.state === "failed" ? "Export failed" : job.state === "completed" ? "Export ready" : "Exporting" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ProgressList, { progress: job.progress }),
            job.downloadable ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Box, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Button, { variant: "secondary", onClick: () => void downloadArchive(job.documentId, job.filename || `${suggestedName}.zip`), children: "Download archive" }) }) : null,
            job.errors?.length ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_design_system4.Alert, { closeLabel: "Close", title: "Export failed", variant: "danger", children: job.errors[0].message }) : null
          ] }) : null
        ] })
      ] });
    };
  }
});

// admin/src/pages/HistoryPage.tsx
var React3, import_design_system5, import_admin3, import_jsx_runtime5, duration, count, statusVariant, HistoryPage;
var init_HistoryPage = __esm({
  "admin/src/pages/HistoryPage.tsx"() {
    React3 = __toESM(require("react"));
    import_design_system5 = require("@strapi/design-system");
    import_admin3 = require("@strapi/strapi/admin");
    init_api();
    import_jsx_runtime5 = require("react/jsx-runtime");
    duration = (job) => {
      if (!job.startedAt || !job.finishedAt) {
        return "\u2014";
      }
      const seconds = (new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()) / 1e3;
      return `${seconds.toFixed(1)}s`;
    };
    count = (job, key) => {
      const summary = job.summary ?? {};
      const value = summary[key];
      return typeof value === "number" ? String(value) : "\u2014";
    };
    statusVariant = (state) => {
      if (state === "completed") {
        return "success";
      }
      if (state === "failed") {
        return "danger";
      }
      if (state === "running") {
        return "primary";
      }
      return "neutral";
    };
    HistoryPage = () => {
      const client = (0, import_admin3.useFetchClient)();
      const [jobs, setJobs] = React3.useState([]);
      const [error, setError] = React3.useState("");
      const load = React3.useCallback(() => {
        api(client).history().then(setJobs).catch((cause) => setError(cause.message));
      }, [client]);
      const remove = async (job) => {
        if (!window.confirm(`Delete this ${job.operation} record and its file from disk?`)) {
          return;
        }
        setError("");
        try {
          await api(client).deleteJob(job.documentId);
          load();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Could not delete this history record.");
        }
      };
      const clearFinished = async () => {
        if (!window.confirm("Delete every finished import and export, including the files stored on disk?")) {
          return;
        }
        setError("");
        try {
          await api(client).clearHistory();
          load();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Could not clear history.");
        }
      };
      React3.useEffect(() => {
        load();
      }, [load]);
      const finished = jobs.some((job) => job.state !== "queued" && job.state !== "running");
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_design_system5.Flex, { direction: "column", alignItems: "stretch", gap: 4, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_design_system5.Flex, { justifyContent: "space-between", alignItems: "center", gap: 4, wrap: "wrap", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Box, { grow: 1, basis: "16rem", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { variant: "omega", textColor: "neutral600", children: "Deleting a finished job removes the log and its file from disk." }) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_design_system5.Flex, { gap: 2, children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Button, { variant: "tertiary", onClick: load, children: "Refresh" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Button, { variant: "danger-light", disabled: !finished, onClick: () => void clearFinished(), children: "Clear finished" })
          ] })
        ] }),
        error ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { textColor: "danger600", children: error }) : null,
        jobs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.EmptyStateLayout, { content: "No import or export jobs yet.", action: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Button, { onClick: load, children: "Refresh" }) }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Box, { background: "neutral0", hasRadius: true, shadow: "filterShadow", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_design_system5.Table, { colCount: 9, rowCount: jobs.length, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Thead, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_design_system5.Tr, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Th, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { variant: "sigma", children: "Operation" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Th, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { variant: "sigma", children: "Started" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Th, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { variant: "sigma", children: "Status" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Th, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { variant: "sigma", children: "Created" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Th, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { variant: "sigma", children: "Updated" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Th, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { variant: "sigma", children: "Skipped" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Th, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { variant: "sigma", children: "Failed" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Th, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { variant: "sigma", children: "Duration" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Th, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Flex, { justifyContent: "flex-end", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { variant: "sigma", children: "Actions" }) }) })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Tbody, { children: jobs.map((job) => {
            const locked = job.state === "queued" || job.state === "running";
            return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_design_system5.Tr, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Td, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { children: job.operation }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Td, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { children: job.startedAt ? new Date(job.startedAt).toLocaleString() : "\u2014" }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Td, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Status, { variant: statusVariant(job.state), size: "S", children: job.state }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Td, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { children: count(job, "created") }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Td, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { children: count(job, "updated") }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Td, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { children: count(job, "skipped") }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Td, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { children: count(job, "failed") }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Td, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { children: duration(job) }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Td, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_design_system5.Flex, { gap: 2, justifyContent: "flex-end", children: [
                job.downloadable ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Button, { size: "S", variant: "tertiary", onClick: () => void downloadArchive(job.documentId, job.filename || "export.zip"), children: "Download" }) : null,
                locked ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Typography, { textColor: "neutral600", children: "\u2014" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_design_system5.Button, { size: "S", variant: "danger-light", onClick: () => void remove(job), children: "Delete" })
              ] }) })
            ] }, job.documentId);
          }) })
        ] }) })
      ] });
    };
  }
});

// admin/src/pages/ImportPage.tsx
var React4, import_design_system6, import_admin4, import_jsx_runtime6, statRows, ImportPage;
var init_ImportPage = __esm({
  "admin/src/pages/ImportPage.tsx"() {
    React4 = __toESM(require("react"));
    import_design_system6 = require("@strapi/design-system");
    import_admin4 = require("@strapi/strapi/admin");
    init_Panel();
    init_ProgressList();
    init_SelectField();
    init_useJob();
    init_api();
    import_jsx_runtime6 = require("react/jsx-runtime");
    statRows = (preview) => [
      ["Content types", preview.stats.contentTypes],
      ["Entries", preview.stats.entries],
      ["Components", preview.stats.components],
      ["Dynamic zones", preview.stats.dynamicZones],
      ["Relations", preview.stats.relations],
      ["Media", preview.stats.media]
    ];
    ImportPage = () => {
      const client = (0, import_admin4.useFetchClient)();
      const { toggleNotification } = (0, import_admin4.useNotification)();
      const [file, setFile] = React4.useState(null);
      const [token, setToken] = React4.useState("");
      const [preview, setPreview] = React4.useState(null);
      const [strategy, setStrategy] = React4.useState("skip");
      const [publishMode, setPublishMode] = React4.useState("preserve");
      const [unresolved, setUnresolved] = React4.useState("error");
      const [decisions, setDecisions] = React4.useState({});
      const [error, setError] = React4.useState("");
      const [jobId, setJobId] = React4.useState(null);
      const { job } = useJob(jobId);
      const warnings = preview?.issues.filter((issue) => issue.level === "warning") ?? [];
      const errors = preview?.issues.filter((issue) => issue.level === "error") ?? [];
      const existing = preview?.conflicts.length ?? 0;
      const fresh = Math.max(0, (preview?.stats.entries ?? 0) - existing);
      const outcome = !preview ? null : strategy === "update" ? { create: fresh, update: existing, skip: 0 } : strategy === "create" ? { create: preview.stats.entries, update: 0, skip: 0 } : strategy === "skip" ? { create: fresh, update: 0, skip: existing } : {
        create: fresh + preview.conflicts.filter((conflict) => decisions[`${conflict.uid}:${conflict.documentId}`] === "create").length,
        update: preview.conflicts.filter((conflict) => decisions[`${conflict.uid}:${conflict.documentId}`] === "update").length,
        skip: preview.conflicts.filter((conflict) => (decisions[`${conflict.uid}:${conflict.documentId}`] ?? "skip") === "skip").length
      };
      const onValidate = async () => {
        if (!file) {
          return;
        }
        setError("");
        setPreview(null);
        try {
          const result = await api(client).validate(file);
          setToken(result.token);
          setPreview(result.preview);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Validation failed.");
        }
      };
      const onImport = async () => {
        setError("");
        try {
          const created = await api(client).startImport(token, {
            conflictStrategy: strategy,
            publishMode,
            unresolvedRelations: unresolved,
            decisions: strategy === "ask" ? decisions : void 0
          });
          setJobId(created.documentId);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Import could not be started.");
        }
      };
      React4.useEffect(() => {
        if (job?.state === "completed") {
          toggleNotification({ type: "success", message: "Import completed." });
        }
        if (job?.state === "failed") {
          toggleNotification({ type: "danger", message: job.errors?.[0]?.message ?? "Import failed." });
        }
      }, [job?.errors, job?.state, toggleNotification]);
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Flex, { direction: "column", alignItems: "stretch", gap: 4, children: [
        error ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Alert, { closeLabel: "Close", title: "Import", variant: "danger", children: error }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
          Panel,
          {
            title: "Package",
            hint: "Validate first. Nothing is written until you import. The destination must already have the same content types and components.",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Box, { padding: 4, background: "neutral100", hasRadius: true, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Flex, { direction: "column", alignItems: "flex-start", gap: 2, children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { fontWeight: "bold", children: file ? file.name : "Choose a .zip package" }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "pi", textColor: "neutral600", children: "Packages from another Strapi 5 project work when that project\u2019s schema matches this one." }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { "aria-label": "Export package", type: "file", accept: ".zip,application/zip", onChange: (event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                  setToken("");
                } })
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Box, { children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Button, { onClick: () => void onValidate(), disabled: !file, variant: "secondary", children: "Validate" }) })
            ]
          }
        ),
        preview ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(Panel, { title: "Preview", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Flex, { gap: 2, wrap: "wrap", children: [
            statRows(preview).map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Box, { padding: 3, background: "neutral100", hasRadius: true, style: { flex: "1 1 140px" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "pi", textColor: "neutral600", children: label }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "beta", children: value })
            ] }, String(label))),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Box, { padding: 3, background: "neutral100", hasRadius: true, style: { flex: "1 1 140px" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "pi", textColor: "neutral600", children: "Warnings" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "beta", children: warnings.length })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Box, { padding: 3, background: "neutral100", hasRadius: true, style: { flex: "1 1 140px" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "pi", textColor: "neutral600", children: "Errors" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "beta", textColor: errors.length ? "danger600" : void 0, children: errors.length })
            ] })
          ] }),
          warnings.slice(0, 8).map((issue) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Alert, { closeLabel: "Close", title: issue.code, variant: "warning", children: issue.message }, issue.message)),
          errors.slice(0, 8).map((issue) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Alert, { closeLabel: "Close", title: issue.code, variant: "danger", children: issue.message }, issue.message))
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(Panel, { title: "How to import", hint: "Change the strategy after validation. The counts below update without uploading the file again.", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(SelectField, { label: "Conflict strategy", name: "conflict-strategy", value: strategy, onChange: (value) => setStrategy(value), children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "skip", children: "Skip existing" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "update", children: "Update existing" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "create", children: "Create new" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "ask", children: "Ask for each conflict" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(SelectField, { label: "Draft and publish", name: "publish-mode", value: publishMode, onChange: (value) => setPublishMode(value), children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "preserve", children: "Preserve source status" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "draft", children: "Import as draft (keep published)" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "publish", children: "Import and publish" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(SelectField, { label: "Unresolved relations", name: "unresolved-relations", value: unresolved, onChange: (value) => setUnresolved(value), children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "error", children: "Stop and report" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "warn", children: "Warn and continue" })
          ] }),
          preview && outcome ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Alert, { closeLabel: "Close", title: "What this import will do", variant: outcome.skip > 0 && strategy === "skip" ? "warning" : "success", children: [
            `Create ${outcome.create}, update ${outcome.update}, skip ${outcome.skip}.`,
            strategy === "skip" && existing > 0 ? " Existing entries stay unchanged. Choose Update existing to replace them." : ""
          ] }) : null,
          strategy !== "ask" && preview?.conflicts.length ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Flex, { direction: "column", alignItems: "stretch", gap: 2, children: preview.conflicts.map((conflict) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Typography, { children: [
            conflict.label,
            " already exists",
            conflict.match?.via ? ` (${conflict.match.via})` : "",
            "."
          ] }, `${conflict.uid}:${conflict.documentId}`)) }) : null,
          publishMode === "draft" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "pi", textColor: "neutral600", children: "Import as draft replaces only the draft. A published version that is already online stays published." }) : null,
          strategy === "ask" && preview?.conflicts.length ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Flex, { direction: "column", alignItems: "stretch", gap: 3, children: preview.conflicts.map((conflict) => {
            const key = `${conflict.uid}:${conflict.documentId}`;
            return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Flex, { justifyContent: "space-between", alignItems: "center", gap: 4, wrap: "wrap", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { children: conflict.label }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Box, { style: { minWidth: 180, flex: "1 1 180px" }, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
                SelectField,
                {
                  label: "Decision",
                  name: `decision-${key}`,
                  value: decisions[key] ?? "skip",
                  onChange: (value) => setDecisions((current) => ({ ...current, [key]: value })),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "skip", children: "Skip" }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "update", children: "Update" }),
                    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.SingleSelectOption, { value: "create", children: "Create new" })
                  ]
                }
              ) })
            ] }, key);
          }) }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Divider, {}),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Box, { children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Button, { onClick: () => void onImport(), disabled: !token || Boolean(preview?.blocked) || job?.state === "running", children: "Import" }) }),
          job ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "delta", children: job.state === "failed" ? "Import failed" : job.state === "completed" ? "Import finished" : "Importing" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ProgressList, { progress: job.progress }),
            job.summary ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Flex, { gap: 2, wrap: "wrap", children: ["created", "updated", "skipped", "failed"].map((key) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Box, { padding: 3, background: "neutral100", hasRadius: true, style: { flex: "1 1 120px" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "pi", textColor: "neutral600", children: key }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Typography, { variant: "beta", children: String(job.summary?.[key] ?? 0) })
            ] }, key)) }) : null,
            job.rollback?.attempted ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_design_system6.Typography, { children: [
              "Rollback: ",
              job.rollback.completed ? "Completed" : "Incomplete"
            ] }) : null,
            job.errors?.[0] ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_design_system6.Alert, { closeLabel: "Close", title: "Import failed", variant: "danger", children: job.errors[0].message }) : null
          ] }) : null
        ] })
      ] });
    };
  }
});

// admin/src/pages/App.tsx
var App_exports = {};
__export(App_exports, {
  default: () => App_default
});
var import_react_router_dom, import_design_system7, import_admin5, import_jsx_runtime7, App, App_default;
var init_App = __esm({
  "admin/src/pages/App.tsx"() {
    import_react_router_dom = require("react-router-dom");
    import_design_system7 = require("@strapi/design-system");
    import_admin5 = require("@strapi/strapi/admin");
    init_ExportPage();
    init_HistoryPage();
    init_ImportPage();
    import_jsx_runtime7 = require("react/jsx-runtime");
    App = () => {
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        import_admin5.Layouts.Root,
        {
          sideNav: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_design_system7.SubNav, { "aria-label": "Import and export", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_design_system7.SubNavHeader, { label: "Import / Export" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_design_system7.SubNavSections, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_design_system7.SubNavLink, { tag: import_react_router_dom.NavLink, to: "export", children: "Export" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_design_system7.SubNavLink, { tag: import_react_router_dom.NavLink, to: "import", children: "Import" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_design_system7.SubNavLink, { tag: import_react_router_dom.NavLink, to: "history", children: "History" })
            ] })
          ] }),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_admin5.Page.Title, { children: "Import / Export" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_admin5.Layouts.Header, { title: "Import / Export", subtitle: "Schema-driven transfer between Strapi 5 environments" }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_admin5.Layouts.Content, { children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_design_system7.Box, { paddingBottom: 8, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_react_router_dom.Routes, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react_router_dom.Route, { index: true, element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react_router_dom.Navigate, { to: "export", replace: true }) }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react_router_dom.Route, { path: "export", element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ExportPage, {}) }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react_router_dom.Route, { path: "import", element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ImportPage, {}) }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react_router_dom.Route, { path: "history", element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(HistoryPage, {}) }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_react_router_dom.Route, { path: "*", element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_admin5.Page.Error, {}) })
            ] }) }) })
          ]
        }
      );
    };
    App_default = App;
  }
});

// admin/src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_icons = require("@strapi/icons");
init_pluginId();
var index_default = {
  register(app) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: import_icons.Download,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "Import / Export"
      },
      Component: () => Promise.resolve().then(() => (init_App(), App_exports)),
      permissions: [{ action: `plugin::${PLUGIN_ID}.read`, subject: null }]
    });
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID
    });
  },
  bootstrap() {
  },
  async registerTrads({ locales }) {
    return locales.map((locale) => ({ data: {}, locale }));
  }
};
//# sourceMappingURL=index.js.map
