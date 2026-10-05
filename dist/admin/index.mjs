var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// admin/src/pluginId.ts
var PLUGIN_ID;
var init_pluginId = __esm({
  "admin/src/pluginId.ts"() {
    PLUGIN_ID = "deep-import-export";
  }
});

// admin/src/components/Panel.tsx
import { Box, Flex, Typography } from "@strapi/design-system";
import { jsx, jsxs } from "react/jsx-runtime";
var Panel;
var init_Panel = __esm({
  "admin/src/components/Panel.tsx"() {
    Panel = ({ title, hint, children }) => {
      return /* @__PURE__ */ jsx(Box, { padding: 5, background: "neutral0", hasRadius: true, shadow: "filterShadow", children: /* @__PURE__ */ jsxs(Flex, { direction: "column", alignItems: "stretch", gap: 4, children: [
        /* @__PURE__ */ jsxs(Box, { children: [
          /* @__PURE__ */ jsx(Typography, { variant: "delta", children: title }),
          hint ? /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Typography, { variant: "pi", textColor: "neutral600", children: hint }) }) : null
        ] }),
        children
      ] }) });
    };
  }
});

// admin/src/components/ProgressList.tsx
import { Box as Box2, Flex as Flex2, Typography as Typography2 } from "@strapi/design-system";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var LABELS, percent, ProgressList;
var init_ProgressList = __esm({
  "admin/src/components/ProgressList.tsx"() {
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
      return /* @__PURE__ */ jsx2(Flex2, { direction: "column", alignItems: "stretch", gap: 3, children: Object.keys(LABELS).map((key) => {
        const value = percent(progress?.[key]);
        return /* @__PURE__ */ jsxs2(Flex2, { direction: "column", alignItems: "stretch", gap: 1, children: [
          /* @__PURE__ */ jsxs2(Flex2, { justifyContent: "space-between", children: [
            /* @__PURE__ */ jsx2(Typography2, { variant: "pi", fontWeight: "bold", children: LABELS[key] }),
            /* @__PURE__ */ jsxs2(Typography2, { variant: "pi", children: [
              value,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsx2(Box2, { background: "neutral200", hasRadius: true, style: { height: 8, overflow: "hidden", width: "100%" }, children: /* @__PURE__ */ jsx2(
            Box2,
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
import { Field, SingleSelect } from "@strapi/design-system";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var SelectField;
var init_SelectField = __esm({
  "admin/src/components/SelectField.tsx"() {
    SelectField = ({
      label,
      name,
      value,
      onChange,
      children
    }) => {
      return /* @__PURE__ */ jsxs3(Field.Root, { name, children: [
        /* @__PURE__ */ jsx3(Field.Label, { children: label }),
        /* @__PURE__ */ jsx3(SingleSelect, { value: value || null, onChange: (next) => onChange(String(next)), children })
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
import * as React from "react";
import { useFetchClient } from "@strapi/strapi/admin";
var useJob;
var init_useJob = __esm({
  "admin/src/hooks/useJob.ts"() {
    init_api();
    useJob = (id) => {
      const client = useFetchClient();
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
import * as React2 from "react";
import { Accordion, Alert, Badge, Box as Box3, Button, Checkbox, Divider, Field as Field2, Flex as Flex3, SingleSelectOption, TextInput, Textarea, Typography as Typography3 } from "@strapi/design-system";
import { useFetchClient as useFetchClient2, useNotification } from "@strapi/strapi/admin";
import { Fragment, jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var ExportPage;
var init_ExportPage = __esm({
  "admin/src/pages/ExportPage.tsx"() {
    init_Panel();
    init_ProgressList();
    init_SelectField();
    init_useJob();
    init_api();
    ExportPage = () => {
      const client = useFetchClient2();
      const { toggleNotification } = useNotification();
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
      return /* @__PURE__ */ jsxs4(Flex3, { direction: "column", alignItems: "stretch", gap: 4, children: [
        error ? /* @__PURE__ */ jsx4(Alert, { closeLabel: "Close", title: "Export", variant: "danger", children: error }) : null,
        /* @__PURE__ */ jsxs4(
          Panel,
          {
            title: "Content",
            hint: "The list comes from this Strapi instance. Components, dynamic zones, and nesting are read from the live schema.",
            children: [
              /* @__PURE__ */ jsx4(SelectField, { label: "Content type", name: "content-type", value: uid, onChange: setUid, children: types.map((type) => /* @__PURE__ */ jsx4(SingleSelectOption, { value: type.uid, children: type.displayName }, type.uid)) }),
              selectedType ? /* @__PURE__ */ jsxs4(Flex3, { direction: "column", alignItems: "flex-start", gap: 2, children: [
                /* @__PURE__ */ jsxs4(Flex3, { gap: 2, wrap: "wrap", children: [
                  /* @__PURE__ */ jsx4(Badge, { children: selectedType.kind === "singleType" ? "Single type" : "Collection type" }),
                  /* @__PURE__ */ jsx4(Badge, { active: selectedType.draftAndPublish, children: selectedType.draftAndPublish ? "Draft and publish" : "No versions" }),
                  selectedType.localized ? /* @__PURE__ */ jsx4(Badge, { active: true, children: "Localized" }) : /* @__PURE__ */ jsx4(Badge, { children: "Not localized" })
                ] }),
                /* @__PURE__ */ jsx4(Typography3, { variant: "pi", textColor: "neutral600", children: selectedType.uid })
              ] }) : null,
              /* @__PURE__ */ jsxs4(SelectField, { label: "Versions", name: "versions", value: status, onChange: (value) => setStatus(value), children: [
                /* @__PURE__ */ jsx4(SingleSelectOption, { value: "both", children: "Draft and published" }),
                /* @__PURE__ */ jsx4(SingleSelectOption, { value: "draft", children: "Draft only" }),
                /* @__PURE__ */ jsx4(SingleSelectOption, { value: "published", children: "Published only" })
              ] }),
              selectedType?.localized && selectedType.locales?.length ? /* @__PURE__ */ jsxs4(Box3, { children: [
                /* @__PURE__ */ jsx4(Checkbox, { checked: allLocales, onCheckedChange: (value) => setAllLocales(value === true), children: "All locales" }),
                !allLocales ? /* @__PURE__ */ jsx4(Flex3, { direction: "column", alignItems: "flex-start", gap: 2, marginTop: 2, children: selectedType.locales.map((code) => /* @__PURE__ */ jsxs4(
                  Checkbox,
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
              selectedType?.kind === "collectionType" ? /* @__PURE__ */ jsx4(Checkbox, { checked: allEntries, onCheckedChange: (value) => setAllEntries(value === true), children: "All entries" }) : null,
              !allEntries && selectedType?.kind === "collectionType" ? /* @__PURE__ */ jsxs4(Box3, { children: [
                /* @__PURE__ */ jsxs4(Field2.Root, { name: "entry-search", hint: "Search matches the title, name, or slug fields on this content type.", children: [
                  /* @__PURE__ */ jsx4(Field2.Label, { children: "Find an entry" }),
                  /* @__PURE__ */ jsx4(
                    TextInput,
                    {
                      placeholder: "Title or slug",
                      value: entryQuery,
                      onChange: (event) => setEntryQuery(event.target.value)
                    }
                  ),
                  /* @__PURE__ */ jsx4(Field2.Hint, {})
                ] }),
                /* @__PURE__ */ jsx4(Box3, { marginTop: 3, children: /* @__PURE__ */ jsxs4(
                  Checkbox,
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
                /* @__PURE__ */ jsx4(Box3, { marginTop: 3, padding: 3, background: "neutral100", hasRadius: true, style: { maxHeight: 280, overflow: "auto" }, children: /* @__PURE__ */ jsxs4(Flex3, { direction: "column", alignItems: "flex-start", gap: 2, children: [
                  entries.length === 0 ? /* @__PURE__ */ jsx4(Typography3, { variant: "pi", textColor: "neutral600", children: "No entries match this search." }) : null,
                  entries.map((entry) => /* @__PURE__ */ jsx4(
                    Checkbox,
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
        /* @__PURE__ */ jsxs4(Panel, { title: "Package", hint: "Media and relations are included only when this content type actually has those fields.", children: [
          /* @__PURE__ */ jsxs4(Flex3, { gap: 6, wrap: "wrap", children: [
            /* @__PURE__ */ jsx4(Checkbox, { checked: includeMedia, onCheckedChange: (value) => setIncludeMedia(value === true), children: "Include media files" }),
            /* @__PURE__ */ jsx4(Checkbox, { checked: includeRelations, onCheckedChange: (value) => setIncludeRelations(value === true), children: "Include relations" })
          ] }),
          /* @__PURE__ */ jsxs4(Field2.Root, { name: "file-name", hint: "Leave this empty to use the name suggested from the content type or selected entry.", children: [
            /* @__PURE__ */ jsx4(Field2.Label, { children: "File name" }),
            /* @__PURE__ */ jsx4(
              TextInput,
              {
                placeholder: suggestedName,
                value: fileName,
                onChange: (event) => setFileName(event.target.value)
              }
            ),
            /* @__PURE__ */ jsx4(Field2.Hint, {})
          ] }),
          /* @__PURE__ */ jsx4(Accordion.Root, { collapsible: true, children: /* @__PURE__ */ jsxs4(Accordion.Item, { value: "filters", children: [
            /* @__PURE__ */ jsx4(Accordion.Header, { children: /* @__PURE__ */ jsx4(Accordion.Trigger, { children: "Optional filters" }) }),
            /* @__PURE__ */ jsx4(Accordion.Content, { children: /* @__PURE__ */ jsx4(Box3, { paddingTop: 3, children: /* @__PURE__ */ jsxs4(Field2.Root, { name: "filters", hint: "Strapi document filters as JSON. Leave empty to export the selection above.", children: [
              /* @__PURE__ */ jsx4(Field2.Label, { children: "Filters" }),
              /* @__PURE__ */ jsx4(Textarea, { value: filters, onChange: (event) => setFilters(event.target.value) }),
              /* @__PURE__ */ jsx4(Field2.Hint, {})
            ] }) }) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs4(Panel, { title: "Ready to export", children: [
          /* @__PURE__ */ jsxs4(Typography3, { children: [
            selectedType?.kind === "singleType" || allEntries ? `Every ${selectedType?.displayName ?? "entry"} in this type.` : `${selected.length} selected ${selected.length === 1 ? "entry" : "entries"}.`,
            " ",
            "File: ",
            fileName.trim() || suggestedName,
            ".zip",
            selectedType?.localized && !allLocales ? ` Locales: ${locales.join(", ") || "none"}.` : ""
          ] }),
          /* @__PURE__ */ jsx4(Box3, { children: /* @__PURE__ */ jsx4(Button, { onClick: () => void onExport(), disabled: exportDisabled, children: "Export" }) }),
          job ? /* @__PURE__ */ jsxs4(Fragment, { children: [
            /* @__PURE__ */ jsx4(Divider, {}),
            /* @__PURE__ */ jsx4(Typography3, { variant: "delta", children: job.state === "failed" ? "Export failed" : job.state === "completed" ? "Export ready" : "Exporting" }),
            /* @__PURE__ */ jsx4(ProgressList, { progress: job.progress }),
            job.downloadable ? /* @__PURE__ */ jsx4(Box3, { children: /* @__PURE__ */ jsx4(Button, { variant: "secondary", onClick: () => void downloadArchive(job.documentId, job.filename || `${suggestedName}.zip`), children: "Download archive" }) }) : null,
            job.errors?.length ? /* @__PURE__ */ jsx4(Alert, { closeLabel: "Close", title: "Export failed", variant: "danger", children: job.errors[0].message }) : null
          ] }) : null
        ] })
      ] });
    };
  }
});

// admin/src/pages/HistoryPage.tsx
import * as React3 from "react";
import { Box as Box4, Button as Button2, EmptyStateLayout, Flex as Flex4, Status, Table, Tbody, Td, Th, Thead, Tr, Typography as Typography4 } from "@strapi/design-system";
import { useFetchClient as useFetchClient3 } from "@strapi/strapi/admin";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var duration, count, statusVariant, HistoryPage;
var init_HistoryPage = __esm({
  "admin/src/pages/HistoryPage.tsx"() {
    init_api();
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
      const client = useFetchClient3();
      const [jobs, setJobs] = React3.useState([]);
      const [error, setError] = React3.useState("");
      const load = React3.useCallback(() => {
        api(client).history().then(setJobs).catch((cause) => setError(cause.message));
      }, [client]);
      React3.useEffect(() => {
        load();
      }, [load]);
      return /* @__PURE__ */ jsxs5(Flex4, { direction: "column", alignItems: "stretch", gap: 4, children: [
        /* @__PURE__ */ jsxs5(Flex4, { justifyContent: "space-between", alignItems: "center", gap: 4, wrap: "wrap", children: [
          /* @__PURE__ */ jsx5(Typography4, { variant: "omega", textColor: "neutral600", children: "Past exports and imports. The log stores counts and errors, not file contents or secrets." }),
          /* @__PURE__ */ jsx5(Button2, { variant: "tertiary", onClick: load, children: "Refresh" })
        ] }),
        error ? /* @__PURE__ */ jsx5(Typography4, { textColor: "danger600", children: error }) : null,
        jobs.length === 0 ? /* @__PURE__ */ jsx5(EmptyStateLayout, { content: "No import or export jobs yet.", action: /* @__PURE__ */ jsx5(Button2, { onClick: load, children: "Refresh" }) }) : /* @__PURE__ */ jsx5(Box4, { background: "neutral0", hasRadius: true, shadow: "filterShadow", children: /* @__PURE__ */ jsxs5(Table, { colCount: 8, rowCount: jobs.length, children: [
          /* @__PURE__ */ jsx5(Thead, { children: /* @__PURE__ */ jsxs5(Tr, { children: [
            /* @__PURE__ */ jsx5(Th, { children: /* @__PURE__ */ jsx5(Typography4, { variant: "sigma", children: "Operation" }) }),
            /* @__PURE__ */ jsx5(Th, { children: /* @__PURE__ */ jsx5(Typography4, { variant: "sigma", children: "Started" }) }),
            /* @__PURE__ */ jsx5(Th, { children: /* @__PURE__ */ jsx5(Typography4, { variant: "sigma", children: "Status" }) }),
            /* @__PURE__ */ jsx5(Th, { children: /* @__PURE__ */ jsx5(Typography4, { variant: "sigma", children: "Created" }) }),
            /* @__PURE__ */ jsx5(Th, { children: /* @__PURE__ */ jsx5(Typography4, { variant: "sigma", children: "Updated" }) }),
            /* @__PURE__ */ jsx5(Th, { children: /* @__PURE__ */ jsx5(Typography4, { variant: "sigma", children: "Skipped" }) }),
            /* @__PURE__ */ jsx5(Th, { children: /* @__PURE__ */ jsx5(Typography4, { variant: "sigma", children: "Failed" }) }),
            /* @__PURE__ */ jsx5(Th, { children: /* @__PURE__ */ jsx5(Typography4, { variant: "sigma", children: "Duration" }) })
          ] }) }),
          /* @__PURE__ */ jsx5(Tbody, { children: jobs.map((job) => /* @__PURE__ */ jsxs5(Tr, { children: [
            /* @__PURE__ */ jsx5(Td, { children: /* @__PURE__ */ jsx5(Typography4, { children: job.operation }) }),
            /* @__PURE__ */ jsx5(Td, { children: /* @__PURE__ */ jsx5(Typography4, { children: job.startedAt ? new Date(job.startedAt).toLocaleString() : "\u2014" }) }),
            /* @__PURE__ */ jsx5(Td, { children: /* @__PURE__ */ jsx5(Status, { variant: statusVariant(job.state), size: "S", children: job.state }) }),
            /* @__PURE__ */ jsx5(Td, { children: /* @__PURE__ */ jsx5(Typography4, { children: count(job, "created") }) }),
            /* @__PURE__ */ jsx5(Td, { children: /* @__PURE__ */ jsx5(Typography4, { children: count(job, "updated") }) }),
            /* @__PURE__ */ jsx5(Td, { children: /* @__PURE__ */ jsx5(Typography4, { children: count(job, "skipped") }) }),
            /* @__PURE__ */ jsx5(Td, { children: /* @__PURE__ */ jsx5(Typography4, { children: count(job, "failed") }) }),
            /* @__PURE__ */ jsx5(Td, { children: /* @__PURE__ */ jsxs5(Flex4, { gap: 2, alignItems: "center", children: [
              /* @__PURE__ */ jsx5(Typography4, { children: duration(job) }),
              job.downloadable ? /* @__PURE__ */ jsx5(Button2, { variant: "tertiary", onClick: () => void downloadArchive(job.documentId, job.filename || "export.zip"), children: "Download" }) : null
            ] }) })
          ] }, job.documentId)) })
        ] }) })
      ] });
    };
  }
});

// admin/src/pages/ImportPage.tsx
import * as React4 from "react";
import { Alert as Alert2, Box as Box5, Button as Button3, Divider as Divider2, Flex as Flex5, SingleSelectOption as SingleSelectOption2, Typography as Typography5 } from "@strapi/design-system";
import { useFetchClient as useFetchClient4, useNotification as useNotification2 } from "@strapi/strapi/admin";
import { Fragment as Fragment2, jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var statRows, ImportPage;
var init_ImportPage = __esm({
  "admin/src/pages/ImportPage.tsx"() {
    init_Panel();
    init_ProgressList();
    init_SelectField();
    init_useJob();
    init_api();
    statRows = (preview) => [
      ["Content types", preview.stats.contentTypes],
      ["Entries", preview.stats.entries],
      ["Components", preview.stats.components],
      ["Dynamic zones", preview.stats.dynamicZones],
      ["Relations", preview.stats.relations],
      ["Media", preview.stats.media]
    ];
    ImportPage = () => {
      const client = useFetchClient4();
      const { toggleNotification } = useNotification2();
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
      return /* @__PURE__ */ jsxs6(Flex5, { direction: "column", alignItems: "stretch", gap: 4, children: [
        error ? /* @__PURE__ */ jsx6(Alert2, { closeLabel: "Close", title: "Import", variant: "danger", children: error }) : null,
        /* @__PURE__ */ jsxs6(
          Panel,
          {
            title: "Package",
            hint: "Validate first. Nothing is written until you import. The destination must already have the same content types and components.",
            children: [
              /* @__PURE__ */ jsx6(Box5, { padding: 4, background: "neutral100", hasRadius: true, children: /* @__PURE__ */ jsxs6(Flex5, { direction: "column", alignItems: "flex-start", gap: 2, children: [
                /* @__PURE__ */ jsx6(Typography5, { fontWeight: "bold", children: file ? file.name : "Choose a .zip package" }),
                /* @__PURE__ */ jsx6(Typography5, { variant: "pi", textColor: "neutral600", children: "Packages from another Strapi 5 project work when that project\u2019s schema matches this one." }),
                /* @__PURE__ */ jsx6("input", { "aria-label": "Export package", type: "file", accept: ".zip,application/zip", onChange: (event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                  setToken("");
                } })
              ] }) }),
              /* @__PURE__ */ jsx6(Box5, { children: /* @__PURE__ */ jsx6(Button3, { onClick: () => void onValidate(), disabled: !file, variant: "secondary", children: "Validate" }) })
            ]
          }
        ),
        preview ? /* @__PURE__ */ jsxs6(Panel, { title: "Preview", children: [
          /* @__PURE__ */ jsxs6(Flex5, { gap: 2, wrap: "wrap", children: [
            statRows(preview).map(([label, value]) => /* @__PURE__ */ jsxs6(Box5, { padding: 3, background: "neutral100", hasRadius: true, style: { flex: "1 1 140px" }, children: [
              /* @__PURE__ */ jsx6(Typography5, { variant: "pi", textColor: "neutral600", children: label }),
              /* @__PURE__ */ jsx6(Typography5, { variant: "beta", children: value })
            ] }, String(label))),
            /* @__PURE__ */ jsxs6(Box5, { padding: 3, background: "neutral100", hasRadius: true, style: { flex: "1 1 140px" }, children: [
              /* @__PURE__ */ jsx6(Typography5, { variant: "pi", textColor: "neutral600", children: "Warnings" }),
              /* @__PURE__ */ jsx6(Typography5, { variant: "beta", children: warnings.length })
            ] }),
            /* @__PURE__ */ jsxs6(Box5, { padding: 3, background: "neutral100", hasRadius: true, style: { flex: "1 1 140px" }, children: [
              /* @__PURE__ */ jsx6(Typography5, { variant: "pi", textColor: "neutral600", children: "Errors" }),
              /* @__PURE__ */ jsx6(Typography5, { variant: "beta", textColor: errors.length ? "danger600" : void 0, children: errors.length })
            ] })
          ] }),
          warnings.slice(0, 8).map((issue) => /* @__PURE__ */ jsx6(Alert2, { closeLabel: "Close", title: issue.code, variant: "warning", children: issue.message }, issue.message)),
          errors.slice(0, 8).map((issue) => /* @__PURE__ */ jsx6(Alert2, { closeLabel: "Close", title: issue.code, variant: "danger", children: issue.message }, issue.message))
        ] }) : null,
        /* @__PURE__ */ jsxs6(Panel, { title: "How to import", hint: "Change the strategy after validation. The counts below update without uploading the file again.", children: [
          /* @__PURE__ */ jsxs6(SelectField, { label: "Conflict strategy", name: "conflict-strategy", value: strategy, onChange: (value) => setStrategy(value), children: [
            /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "skip", children: "Skip existing" }),
            /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "update", children: "Update existing" }),
            /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "create", children: "Create new" }),
            /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "ask", children: "Ask for each conflict" })
          ] }),
          /* @__PURE__ */ jsxs6(SelectField, { label: "Draft and publish", name: "publish-mode", value: publishMode, onChange: (value) => setPublishMode(value), children: [
            /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "preserve", children: "Preserve source status" }),
            /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "draft", children: "Import as draft (keep published)" }),
            /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "publish", children: "Import and publish" })
          ] }),
          /* @__PURE__ */ jsxs6(SelectField, { label: "Unresolved relations", name: "unresolved-relations", value: unresolved, onChange: (value) => setUnresolved(value), children: [
            /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "error", children: "Stop and report" }),
            /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "warn", children: "Warn and continue" })
          ] }),
          preview && outcome ? /* @__PURE__ */ jsxs6(Alert2, { closeLabel: "Close", title: "What this import will do", variant: outcome.skip > 0 && strategy === "skip" ? "warning" : "success", children: [
            `Create ${outcome.create}, update ${outcome.update}, skip ${outcome.skip}.`,
            strategy === "skip" && existing > 0 ? " Existing entries stay unchanged. Choose Update existing to replace them." : ""
          ] }) : null,
          strategy !== "ask" && preview?.conflicts.length ? /* @__PURE__ */ jsx6(Flex5, { direction: "column", alignItems: "stretch", gap: 2, children: preview.conflicts.map((conflict) => /* @__PURE__ */ jsxs6(Typography5, { children: [
            conflict.label,
            " already exists",
            conflict.match?.via ? ` (${conflict.match.via})` : "",
            "."
          ] }, `${conflict.uid}:${conflict.documentId}`)) }) : null,
          publishMode === "draft" ? /* @__PURE__ */ jsx6(Typography5, { variant: "pi", textColor: "neutral600", children: "Import as draft replaces only the draft. A published version that is already online stays published." }) : null,
          strategy === "ask" && preview?.conflicts.length ? /* @__PURE__ */ jsx6(Flex5, { direction: "column", alignItems: "stretch", gap: 3, children: preview.conflicts.map((conflict) => {
            const key = `${conflict.uid}:${conflict.documentId}`;
            return /* @__PURE__ */ jsxs6(Flex5, { justifyContent: "space-between", alignItems: "center", gap: 4, wrap: "wrap", children: [
              /* @__PURE__ */ jsx6(Typography5, { children: conflict.label }),
              /* @__PURE__ */ jsx6(Box5, { style: { minWidth: 180, flex: "1 1 180px" }, children: /* @__PURE__ */ jsxs6(
                SelectField,
                {
                  label: "Decision",
                  name: `decision-${key}`,
                  value: decisions[key] ?? "skip",
                  onChange: (value) => setDecisions((current) => ({ ...current, [key]: value })),
                  children: [
                    /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "skip", children: "Skip" }),
                    /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "update", children: "Update" }),
                    /* @__PURE__ */ jsx6(SingleSelectOption2, { value: "create", children: "Create new" })
                  ]
                }
              ) })
            ] }, key);
          }) }) : null,
          /* @__PURE__ */ jsx6(Divider2, {}),
          /* @__PURE__ */ jsx6(Box5, { children: /* @__PURE__ */ jsx6(Button3, { onClick: () => void onImport(), disabled: !token || Boolean(preview?.blocked) || job?.state === "running", children: "Import" }) }),
          job ? /* @__PURE__ */ jsxs6(Fragment2, { children: [
            /* @__PURE__ */ jsx6(Typography5, { variant: "delta", children: job.state === "failed" ? "Import failed" : job.state === "completed" ? "Import finished" : "Importing" }),
            /* @__PURE__ */ jsx6(ProgressList, { progress: job.progress }),
            job.summary ? /* @__PURE__ */ jsx6(Flex5, { gap: 2, wrap: "wrap", children: ["created", "updated", "skipped", "failed"].map((key) => /* @__PURE__ */ jsxs6(Box5, { padding: 3, background: "neutral100", hasRadius: true, style: { flex: "1 1 120px" }, children: [
              /* @__PURE__ */ jsx6(Typography5, { variant: "pi", textColor: "neutral600", children: key }),
              /* @__PURE__ */ jsx6(Typography5, { variant: "beta", children: String(job.summary?.[key] ?? 0) })
            ] }, key)) }) : null,
            job.rollback?.attempted ? /* @__PURE__ */ jsxs6(Typography5, { children: [
              "Rollback: ",
              job.rollback.completed ? "Completed" : "Incomplete"
            ] }) : null,
            job.errors?.[0] ? /* @__PURE__ */ jsx6(Alert2, { closeLabel: "Close", title: "Import failed", variant: "danger", children: job.errors[0].message }) : null
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
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { Box as Box6, SubNav, SubNavHeader, SubNavLink, SubNavSections } from "@strapi/design-system";
import { Layouts, Page } from "@strapi/strapi/admin";
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
var App, App_default;
var init_App = __esm({
  "admin/src/pages/App.tsx"() {
    init_ExportPage();
    init_HistoryPage();
    init_ImportPage();
    App = () => {
      return /* @__PURE__ */ jsxs7(
        Layouts.Root,
        {
          sideNav: /* @__PURE__ */ jsxs7(SubNav, { "aria-label": "Import and export", children: [
            /* @__PURE__ */ jsx7(SubNavHeader, { label: "Import / Export" }),
            /* @__PURE__ */ jsxs7(SubNavSections, { children: [
              /* @__PURE__ */ jsx7(SubNavLink, { tag: NavLink, to: "export", children: "Export" }),
              /* @__PURE__ */ jsx7(SubNavLink, { tag: NavLink, to: "import", children: "Import" }),
              /* @__PURE__ */ jsx7(SubNavLink, { tag: NavLink, to: "history", children: "History" })
            ] })
          ] }),
          children: [
            /* @__PURE__ */ jsx7(Page.Title, { children: "Import / Export" }),
            /* @__PURE__ */ jsx7(Layouts.Header, { title: "Import / Export", subtitle: "Schema-driven transfer between Strapi 5 environments" }),
            /* @__PURE__ */ jsx7(Layouts.Content, { children: /* @__PURE__ */ jsx7(Box6, { paddingBottom: 8, children: /* @__PURE__ */ jsxs7(Routes, { children: [
              /* @__PURE__ */ jsx7(Route, { index: true, element: /* @__PURE__ */ jsx7(Navigate, { to: "export", replace: true }) }),
              /* @__PURE__ */ jsx7(Route, { path: "export", element: /* @__PURE__ */ jsx7(ExportPage, {}) }),
              /* @__PURE__ */ jsx7(Route, { path: "import", element: /* @__PURE__ */ jsx7(ImportPage, {}) }),
              /* @__PURE__ */ jsx7(Route, { path: "history", element: /* @__PURE__ */ jsx7(HistoryPage, {}) }),
              /* @__PURE__ */ jsx7(Route, { path: "*", element: /* @__PURE__ */ jsx7(Page.Error, {}) })
            ] }) }) })
          ]
        }
      );
    };
    App_default = App;
  }
});

// admin/src/index.ts
init_pluginId();
import { Download } from "@strapi/icons";
var index_default = {
  register(app) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: Download,
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
export {
  index_default as default
};
//# sourceMappingURL=index.mjs.map
