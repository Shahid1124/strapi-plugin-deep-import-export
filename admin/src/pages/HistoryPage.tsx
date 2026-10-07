import * as React from "react"
import { Box, Button, EmptyStateLayout, Flex, Status, Table, Tbody, Td, Th, Thead, Tr, Typography } from "@strapi/design-system"
import { useFetchClient } from "@strapi/strapi/admin"
import { api, downloadArchive, type Job } from "../services/api"

const duration = (job: Job) => {
  if (!job.startedAt || !job.finishedAt) {
    return "—"
  }
  const seconds = (new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()) / 1000
  return `${seconds.toFixed(1)}s`
}

const count = (job: Job, key: string) => {
  const summary = job.summary ?? {}
  const value = summary[key]
  return typeof value === "number" ? String(value) : "—"
}

const statusVariant = (state: string) => {
  if (state === "completed") {
    return "success" as const
  }
  if (state === "failed") {
    return "danger" as const
  }
  if (state === "running") {
    return "primary" as const
  }
  return "neutral" as const
}

export const HistoryPage = () => {
  const client = useFetchClient()
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [error, setError] = React.useState("")

  const load = React.useCallback(() => {
    api(client)
      .history()
      .then(setJobs)
      .catch((cause: Error) => setError(cause.message))
  }, [client])

  const remove = async (job: Job) => {
    if (!window.confirm(`Delete this ${job.operation} record and its file from disk?`)) {
      return
    }
    setError("")
    try {
      await api(client).deleteJob(job.documentId)
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this history record.")
    }
  }

  const clearFinished = async () => {
    if (!window.confirm("Delete every finished import and export, including the files stored on disk?")) {
      return
    }
    setError("")
    try {
      await api(client).clearHistory()
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not clear history.")
    }
  }

  React.useEffect(() => {
    load()
  }, [load])

  const finished = jobs.some((job) => job.state !== "queued" && job.state !== "running")

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
        <Box grow={1} basis="16rem">
          <Typography variant="omega" textColor="neutral600">
            Deleting a finished job removes the log and its file from disk.
          </Typography>
        </Box>
        <Flex gap={2}>
          <Button variant="tertiary" onClick={load}>Refresh</Button>
          <Button variant="danger-light" disabled={!finished} onClick={() => void clearFinished()}>
            Clear finished
          </Button>
        </Flex>
      </Flex>
      {error ? <Typography textColor="danger600">{error}</Typography> : null}
      {jobs.length === 0 ? (
        <EmptyStateLayout content="No import or export jobs yet." action={<Button onClick={load}>Refresh</Button>} />
      ) : (
        <Box background="neutral0" hasRadius shadow="filterShadow">
          <Table colCount={9} rowCount={jobs.length}>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">Operation</Typography></Th>
                <Th><Typography variant="sigma">Started</Typography></Th>
                <Th><Typography variant="sigma">Status</Typography></Th>
                <Th><Typography variant="sigma">Created</Typography></Th>
                <Th><Typography variant="sigma">Updated</Typography></Th>
                <Th><Typography variant="sigma">Skipped</Typography></Th>
                <Th><Typography variant="sigma">Failed</Typography></Th>
                <Th><Typography variant="sigma">Duration</Typography></Th>
                <Th>
                  <Flex justifyContent="flex-end">
                    <Typography variant="sigma">Actions</Typography>
                  </Flex>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {jobs.map((job) => {
                const locked = job.state === "queued" || job.state === "running"
                return (
                  <Tr key={job.documentId}>
                    <Td><Typography>{job.operation}</Typography></Td>
                    <Td><Typography>{job.startedAt ? new Date(job.startedAt).toLocaleString() : "—"}</Typography></Td>
                    <Td><Status variant={statusVariant(job.state)} size="S">{job.state}</Status></Td>
                    <Td><Typography>{count(job, "created")}</Typography></Td>
                    <Td><Typography>{count(job, "updated")}</Typography></Td>
                    <Td><Typography>{count(job, "skipped")}</Typography></Td>
                    <Td><Typography>{count(job, "failed")}</Typography></Td>
                    <Td><Typography>{duration(job)}</Typography></Td>
                    <Td>
                      <Flex gap={2} justifyContent="flex-end">
                        {job.downloadable ? (
                          <Button size="S" variant="tertiary" onClick={() => void downloadArchive(job.documentId, job.filename || "export.zip")}>
                            Download
                          </Button>
                        ) : null}
                        {locked ? (
                          <Typography textColor="neutral600">—</Typography>
                        ) : (
                          <Button size="S" variant="danger-light" onClick={() => void remove(job)}>
                            Delete
                          </Button>
                        )}
                      </Flex>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </Box>
      )}
    </Flex>
  )
}
