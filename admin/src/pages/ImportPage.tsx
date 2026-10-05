import * as React from "react"
import { Alert, Box, Button, Divider, Flex, SingleSelectOption, Typography } from "@strapi/design-system"
import { useFetchClient, useNotification } from "@strapi/strapi/admin"
import { Panel } from "../components/Panel"
import { ProgressList } from "../components/ProgressList"
import { SelectField } from "../components/SelectField"
import { useJob } from "../hooks/useJob"
import { api, type Preview } from "../services/api"

const statRows = (preview: Preview) => [
  ["Content types", preview.stats.contentTypes],
  ["Entries", preview.stats.entries],
  ["Components", preview.stats.components],
  ["Dynamic zones", preview.stats.dynamicZones],
  ["Relations", preview.stats.relations],
  ["Media", preview.stats.media],
]

export const ImportPage = () => {
  const client = useFetchClient()
  const { toggleNotification } = useNotification()
  const [file, setFile] = React.useState<File | null>(null)
  const [token, setToken] = React.useState("")
  const [preview, setPreview] = React.useState<Preview | null>(null)
  const [strategy, setStrategy] = React.useState<"skip" | "update" | "create" | "ask">("skip")
  const [publishMode, setPublishMode] = React.useState<"draft" | "publish" | "preserve">("preserve")
  const [unresolved, setUnresolved] = React.useState<"error" | "warn">("error")
  const [decisions, setDecisions] = React.useState<Record<string, "skip" | "update" | "create">>({})
  const [error, setError] = React.useState("")
  const [jobId, setJobId] = React.useState<string | null>(null)
  const { job } = useJob(jobId)
  const warnings = preview?.issues.filter((issue) => issue.level === "warning") ?? []
  const errors = preview?.issues.filter((issue) => issue.level === "error") ?? []
  const existing = preview?.conflicts.length ?? 0
  const fresh = Math.max(0, (preview?.stats.entries ?? 0) - existing)
  const outcome = !preview
    ? null
    : strategy === "update"
      ? { create: fresh, update: existing, skip: 0 }
      : strategy === "create"
        ? { create: preview.stats.entries, update: 0, skip: 0 }
        : strategy === "skip"
          ? { create: fresh, update: 0, skip: existing }
          : {
              create: fresh + preview.conflicts.filter((conflict) => decisions[`${conflict.uid}:${conflict.documentId}`] === "create").length,
              update: preview.conflicts.filter((conflict) => decisions[`${conflict.uid}:${conflict.documentId}`] === "update").length,
              skip: preview.conflicts.filter((conflict) => (decisions[`${conflict.uid}:${conflict.documentId}`] ?? "skip") === "skip").length,
            }

  const onValidate = async () => {
    if (!file) {
      return
    }
    setError("")
    setPreview(null)
    try {
      const result = await api(client).validate(file)
      setToken(result.token)
      setPreview(result.preview)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Validation failed.")
    }
  }

  const onImport = async () => {
    setError("")
    try {
      const created = await api(client).startImport(token, {
        conflictStrategy: strategy,
        publishMode,
        unresolvedRelations: unresolved,
        decisions: strategy === "ask" ? decisions : undefined,
      })
      setJobId(created.documentId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import could not be started.")
    }
  }

  React.useEffect(() => {
    if (job?.state === "completed") {
      toggleNotification({ type: "success", message: "Import completed." })
    }
    if (job?.state === "failed") {
      toggleNotification({ type: "danger", message: job.errors?.[0]?.message ?? "Import failed." })
    }
  }, [job?.errors, job?.state, toggleNotification])

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      {error ? <Alert closeLabel="Close" title="Import" variant="danger">{error}</Alert> : null}
      <Panel
        title="Package"
        hint="Validate first. Nothing is written until you import. The destination must already have the same content types and components."
      >
        <Box padding={4} background="neutral100" hasRadius>
          <Flex direction="column" alignItems="flex-start" gap={2}>
            <Typography fontWeight="bold">{file ? file.name : "Choose a .zip package"}</Typography>
            <Typography variant="pi" textColor="neutral600">Packages from another Strapi 5 project work when that project’s schema matches this one.</Typography>
            <input aria-label="Export package" type="file" accept=".zip,application/zip" onChange={(event) => {
              setFile(event.target.files?.[0] ?? null)
              setPreview(null)
              setToken("")
            }} />
          </Flex>
        </Box>
        <Box>
          <Button onClick={() => void onValidate()} disabled={!file} variant="secondary">Validate</Button>
        </Box>
      </Panel>
      {preview ? (
        <Panel title="Preview">
          <Flex gap={2} wrap="wrap">
            {statRows(preview).map(([label, value]) => (
              <Box key={String(label)} padding={3} background="neutral100" hasRadius style={{ flex: "1 1 140px" }}>
                <Typography variant="pi" textColor="neutral600">{label}</Typography>
                <Typography variant="beta">{value}</Typography>
              </Box>
            ))}
            <Box padding={3} background="neutral100" hasRadius style={{ flex: "1 1 140px" }}>
              <Typography variant="pi" textColor="neutral600">Warnings</Typography>
              <Typography variant="beta">{warnings.length}</Typography>
            </Box>
            <Box padding={3} background="neutral100" hasRadius style={{ flex: "1 1 140px" }}>
              <Typography variant="pi" textColor="neutral600">Errors</Typography>
              <Typography variant="beta" textColor={errors.length ? "danger600" : undefined}>{errors.length}</Typography>
            </Box>
          </Flex>
          {warnings.slice(0, 8).map((issue) => (
            <Alert key={issue.message} closeLabel="Close" title={issue.code} variant="warning">{issue.message}</Alert>
          ))}
          {errors.slice(0, 8).map((issue) => (
            <Alert key={issue.message} closeLabel="Close" title={issue.code} variant="danger">{issue.message}</Alert>
          ))}
        </Panel>
      ) : null}
      <Panel title="How to import" hint="Change the strategy after validation. The counts below update without uploading the file again.">
        <SelectField label="Conflict strategy" name="conflict-strategy" value={strategy} onChange={(value) => setStrategy(value as "skip" | "update" | "create" | "ask")}>
          <SingleSelectOption value="skip">Skip existing</SingleSelectOption>
          <SingleSelectOption value="update">Update existing</SingleSelectOption>
          <SingleSelectOption value="create">Create new</SingleSelectOption>
          <SingleSelectOption value="ask">Ask for each conflict</SingleSelectOption>
        </SelectField>
        <SelectField label="Draft and publish" name="publish-mode" value={publishMode} onChange={(value) => setPublishMode(value as "draft" | "publish" | "preserve")}>
          <SingleSelectOption value="preserve">Preserve source status</SingleSelectOption>
          <SingleSelectOption value="draft">Import as draft (keep published)</SingleSelectOption>
          <SingleSelectOption value="publish">Import and publish</SingleSelectOption>
        </SelectField>
        <SelectField label="Unresolved relations" name="unresolved-relations" value={unresolved} onChange={(value) => setUnresolved(value as "error" | "warn")}>
          <SingleSelectOption value="error">Stop and report</SingleSelectOption>
          <SingleSelectOption value="warn">Warn and continue</SingleSelectOption>
        </SelectField>
        {preview && outcome ? (
          <Alert closeLabel="Close" title="What this import will do" variant={outcome.skip > 0 && strategy === "skip" ? "warning" : "success"}>
            {`Create ${outcome.create}, update ${outcome.update}, skip ${outcome.skip}.`}
            {strategy === "skip" && existing > 0 ? " Existing entries stay unchanged. Choose Update existing to replace them." : ""}
          </Alert>
        ) : null}
        {strategy !== "ask" && preview?.conflicts.length ? (
          <Flex direction="column" alignItems="stretch" gap={2}>
            {preview.conflicts.map((conflict) => (
              <Typography key={`${conflict.uid}:${conflict.documentId}`}>
                {conflict.label} already exists{conflict.match?.via ? ` (${conflict.match.via})` : ""}.
              </Typography>
            ))}
          </Flex>
        ) : null}
        {publishMode === "draft" ? (
          <Typography variant="pi" textColor="neutral600">Import as draft replaces only the draft. A published version that is already online stays published.</Typography>
        ) : null}
        {strategy === "ask" && preview?.conflicts.length ? (
          <Flex direction="column" alignItems="stretch" gap={3}>
            {preview.conflicts.map((conflict) => {
              const key = `${conflict.uid}:${conflict.documentId}`
              return (
                <Flex key={key} justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
                  <Typography>{conflict.label}</Typography>
                  <Box style={{ minWidth: 180, flex: "1 1 180px" }}>
                    <SelectField
                      label="Decision"
                      name={`decision-${key}`}
                      value={decisions[key] ?? "skip"}
                      onChange={(value) => setDecisions((current) => ({ ...current, [key]: value as "skip" | "update" | "create" }))}
                    >
                      <SingleSelectOption value="skip">Skip</SingleSelectOption>
                      <SingleSelectOption value="update">Update</SingleSelectOption>
                      <SingleSelectOption value="create">Create new</SingleSelectOption>
                    </SelectField>
                  </Box>
                </Flex>
              )
            })}
          </Flex>
        ) : null}
        <Divider />
        <Box>
          <Button onClick={() => void onImport()} disabled={!token || Boolean(preview?.blocked) || job?.state === "running"}>Import</Button>
        </Box>
        {job ? (
          <>
            <Typography variant="delta">{job.state === "failed" ? "Import failed" : job.state === "completed" ? "Import finished" : "Importing"}</Typography>
            <ProgressList progress={job.progress} />
            {job.summary ? (
              <Flex gap={2} wrap="wrap">
                {(["created", "updated", "skipped", "failed"] as const).map((key) => (
                  <Box key={key} padding={3} background="neutral100" hasRadius style={{ flex: "1 1 120px" }}>
                    <Typography variant="pi" textColor="neutral600">{key}</Typography>
                    <Typography variant="beta">{String(job.summary?.[key] ?? 0)}</Typography>
                  </Box>
                ))}
              </Flex>
            ) : null}
            {job.rollback?.attempted ? (
              <Typography>Rollback: {job.rollback.completed ? "Completed" : "Incomplete"}</Typography>
            ) : null}
            {job.errors?.[0] ? <Alert closeLabel="Close" title="Import failed" variant="danger">{job.errors[0].message}</Alert> : null}
          </>
        ) : null}
      </Panel>
    </Flex>
  )
}
