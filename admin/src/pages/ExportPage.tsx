import * as React from "react"
import { Accordion, Alert, Badge, Box, Button, Checkbox, Divider, Field, Flex, SingleSelectOption, TextInput, Textarea, Typography } from "@strapi/design-system"
import { useFetchClient, useNotification } from "@strapi/strapi/admin"
import { Panel } from "../components/Panel"
import { ProgressList } from "../components/ProgressList"
import { SelectField } from "../components/SelectField"
import { useJob } from "../hooks/useJob"
import { api, downloadArchive, type ContentTypeOption, type EntryOption } from "../services/api"

export const ExportPage = () => {
  const client = useFetchClient()
  const { toggleNotification } = useNotification()
  const [types, setTypes] = React.useState<ContentTypeOption[]>([])
  const [uid, setUid] = React.useState("")
  const [entries, setEntries] = React.useState<EntryOption[]>([])
  const [selected, setSelected] = React.useState<string[]>([])
  const [allEntries, setAllEntries] = React.useState(true)
  const [entryQuery, setEntryQuery] = React.useState("")
  const [includeMedia, setIncludeMedia] = React.useState(true)
  const [allLocales, setAllLocales] = React.useState(true)
  const [locales, setLocales] = React.useState<string[]>([])
  const [includeRelations, setIncludeRelations] = React.useState(true)
  const [status, setStatus] = React.useState<"draft" | "published" | "both">("both")
  const [filters, setFilters] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [error, setError] = React.useState("")
  const { job } = useJob(jobId)
  const selectedType = types.find((type) => type.uid === uid)
  const suggestedName = React.useMemo(() => {
    const typeName = selectedType?.displayName ?? "export"
    const single = !allEntries && selected.length === 1
      ? entries.find((entry) => entry.documentId === selected[0])?.label
      : undefined
    const raw = single ? `${typeName}-${single}` : typeName
    return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "export"
  }, [allEntries, entries, selected, selectedType?.displayName])
  const exportDisabled = !uid
    || job?.state === "running"
    || (!allEntries && selectedType?.kind === "collectionType" && selected.length === 0)
    || (Boolean(selectedType?.localized) && !allLocales && locales.length === 0)

  React.useEffect(() => {
    api(client)
      .contentTypes()
      .then((next) => {
        setTypes(next)
        if (next[0]) {
          setUid(next[0].uid)
        }
      })
      .catch((cause: Error) => setError(cause.message))
  }, [client])

  React.useEffect(() => {
    setAllLocales(true)
    setLocales([])
    setSelected([])
    setFileName("")
  }, [uid])

  React.useEffect(() => {
    if (!uid || selectedType?.kind === "singleType") {
      setEntries([])
      return
    }
    api(client)
      .entries(uid, entryQuery)
      .then(setEntries)
      .catch((cause: Error) => setError(cause.message))
  }, [client, entryQuery, selectedType?.kind, uid])

  const onExport = async () => {
    setError("")
    try {
      let parsedFilters: Record<string, unknown> | undefined
      if (filters.trim()) {
        parsedFilters = JSON.parse(filters) as Record<string, unknown>
      }
      const created = await api(client).startExport({
        contentTypes: [uid],
        documentIds: allEntries || selectedType?.kind === "singleType" ? undefined : selected,
        includeMedia,
        includeRelations,
        status,
        filters: parsedFilters,
        archiveName: fileName.trim() || suggestedName,
        locales: selectedType?.localized && !allLocales ? locales : undefined,
      })
      setJobId(created.documentId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export could not be started.")
    }
  }

  React.useEffect(() => {
    if (job?.state === "completed") {
      toggleNotification({ type: "success", message: "Export completed." })
    }
    if (job?.state === "failed") {
      toggleNotification({ type: "danger", message: job.errors?.[0]?.message ?? "Export failed." })
    }
  }, [job?.state, job?.errors, toggleNotification])

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {error ? <Alert closeLabel="Close" title="Export" variant="danger">{error}</Alert> : null}
      <Panel
        title="Content"
        hint="The list comes from this Strapi instance. Components, dynamic zones, and nesting are read from the live schema."
      >
        <SelectField label="Content type" name="content-type" value={uid} onChange={setUid}>
          {types.map((type) => (
            <SingleSelectOption key={type.uid} value={type.uid}>
              {type.displayName}
            </SingleSelectOption>
          ))}
        </SelectField>
        {selectedType ? (
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Flex gap={2} wrap="wrap">
              <Badge>{selectedType.kind === "singleType" ? "Single type" : "Collection type"}</Badge>
              <Badge active={selectedType.draftAndPublish}>{selectedType.draftAndPublish ? "Draft and publish" : "No versions"}</Badge>
              {selectedType.localized ? <Badge active>Localized</Badge> : <Badge>Not localized</Badge>}
            </Flex>
            <Typography variant="pi" textColor="neutral600">{selectedType.uid}</Typography>
          </Flex>
        ) : null}
        <SelectField label="Versions" name="versions" value={status} onChange={(value) => setStatus(value as "draft" | "published" | "both")}>
          <SingleSelectOption value="both">Draft and published</SingleSelectOption>
          <SingleSelectOption value="draft">Draft only</SingleSelectOption>
          <SingleSelectOption value="published">Published only</SingleSelectOption>
        </SelectField>
        {selectedType?.localized && selectedType.locales?.length ? (
          <Box>
            <Checkbox checked={allLocales} onCheckedChange={(value) => setAllLocales(value === true)}>All locales</Checkbox>
            {!allLocales ? (
              <Flex direction="column" alignItems="flex-start" gap={2} marginTop={2}>
                {selectedType.locales.map((code) => (
                  <Checkbox
                    key={code}
                    checked={locales.includes(code)}
                    onCheckedChange={(value) => {
                      setLocales((current) => value === true ? [...current, code] : current.filter((item) => item !== code))
                    }}
                  >
                    {code}{code === selectedType.defaultLocale ? " (default)" : ""}
                  </Checkbox>
                ))}
              </Flex>
            ) : null}
          </Box>
        ) : null}
        {selectedType?.kind === "collectionType" ? (
          <Checkbox checked={allEntries} onCheckedChange={(value) => setAllEntries(value === true)}>All entries</Checkbox>
        ) : null}
        {!allEntries && selectedType?.kind === "collectionType" ? (
          <Box>
            <Field.Root name="entry-search" hint="Search matches the title, name, or slug fields on this content type.">
              <Field.Label>Find an entry</Field.Label>
              <TextInput
                placeholder="Title or slug"
                value={entryQuery}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEntryQuery(event.target.value)}
              />
              <Field.Hint />
            </Field.Root>
            <Box marginTop={3}>
              <Checkbox
                checked={entries.length > 0 && entries.every((entry) => selected.includes(entry.documentId))}
                onCheckedChange={(value) => {
                  const shown = entries.map((entry) => entry.documentId)
                  setSelected((current) => value === true
                    ? [...new Set([...current, ...shown])]
                    : current.filter((id) => !shown.includes(id)))
                }}
              >
                Select shown ({entries.length})
              </Checkbox>
            </Box>
            <Box marginTop={3} padding={3} background="neutral100" hasRadius style={{ maxHeight: 280, overflow: "auto" }}>
              <Flex direction="column" alignItems="flex-start" gap={2}>
                {entries.length === 0 ? <Typography variant="pi" textColor="neutral600">No entries match this search.</Typography> : null}
                {entries.map((entry) => (
                  <Checkbox
                    key={entry.documentId}
                    checked={selected.includes(entry.documentId)}
                    onCheckedChange={(value) => {
                      setSelected((current) => value === true ? [...current, entry.documentId] : current.filter((id) => id !== entry.documentId))
                    }}
                  >
                    {String(entry.label)}
                  </Checkbox>
                ))}
              </Flex>
            </Box>
          </Box>
        ) : null}
      </Panel>
      <Panel title="Package" hint="Media and relations are included only when this content type actually has those fields.">
        <Flex gap={6} wrap="wrap">
          <Checkbox checked={includeMedia} onCheckedChange={(value) => setIncludeMedia(value === true)}>Include media files</Checkbox>
          <Checkbox checked={includeRelations} onCheckedChange={(value) => setIncludeRelations(value === true)}>Include relations</Checkbox>
        </Flex>
        <Field.Root name="file-name" hint="Leave this empty to use the name suggested from the content type or selected entry.">
          <Field.Label>File name</Field.Label>
          <TextInput
            placeholder={suggestedName}
            value={fileName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setFileName(event.target.value)}
          />
          <Field.Hint />
        </Field.Root>
        <Accordion.Root collapsible>
          <Accordion.Item value="filters">
            <Accordion.Header>
              <Accordion.Trigger>Optional filters</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <Box paddingTop={3}>
                <Field.Root name="filters" hint="Strapi document filters as JSON. Leave empty to export the selection above.">
                  <Field.Label>Filters</Field.Label>
                  <Textarea value={filters} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setFilters(event.target.value)} />
                  <Field.Hint />
                </Field.Root>
              </Box>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </Panel>
      <Panel title="Ready to export">
        <Typography>
          {selectedType?.kind === "singleType" || allEntries
            ? `Every ${selectedType?.displayName ?? "entry"} in this type.`
            : `${selected.length} selected ${selected.length === 1 ? "entry" : "entries"}.`}
          {" "}File: {(fileName.trim() || suggestedName)}.zip
          {selectedType?.localized && !allLocales ? ` Locales: ${locales.join(", ") || "none"}.` : ""}
        </Typography>
        <Box>
          <Button onClick={() => void onExport()} disabled={exportDisabled}>Export</Button>
        </Box>
        {job ? (
          <>
            <Divider />
            <Typography variant="delta">{job.state === "failed" ? "Export failed" : job.state === "completed" ? "Export ready" : "Exporting"}</Typography>
            <ProgressList progress={job.progress} />
            {job.downloadable ? (
              <Box>
                <Button variant="secondary" onClick={() => void downloadArchive(job.documentId, job.filename || `${suggestedName}.zip`)}>Download archive</Button>
              </Box>
            ) : null}
            {job.errors?.length ? <Alert closeLabel="Close" title="Export failed" variant="danger">{job.errors[0].message}</Alert> : null}
          </>
        ) : null}
      </Panel>
    </Flex>
  )
}
