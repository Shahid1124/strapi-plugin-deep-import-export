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

  React.useEffect(() => {
    load()
  }, [load])

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
        <Typography variant="omega" textColor="neutral600">Past exports and imports. The log stores counts and errors, not file contents or secrets.</Typography>
        <Button variant="tertiary" onClick={load}>Refresh</Button>
      </Flex>
      {error ? <Typography textColor="danger600">{error}</Typography> : null}
      {jobs.length === 0 ? (
        <EmptyStateLayout content="No import or export jobs yet." action={<Button onClick={load}>Refresh</Button>} />
      ) : (
        <Box background="neutral0" hasRadius shadow="filterShadow">
          <Table colCount={8} rowCount={jobs.length}>
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
              </Tr>
            </Thead>
            <Tbody>
              {jobs.map((job) => (
                <Tr key={job.documentId}>
                  <Td><Typography>{job.operation}</Typography></Td>
                  <Td><Typography>{job.startedAt ? new Date(job.startedAt).toLocaleString() : "—"}</Typography></Td>
                  <Td><Status variant={statusVariant(job.state)} size="S">{job.state}</Status></Td>
                  <Td><Typography>{count(job, "created")}</Typography></Td>
                  <Td><Typography>{count(job, "updated")}</Typography></Td>
                  <Td><Typography>{count(job, "skipped")}</Typography></Td>
                  <Td><Typography>{count(job, "failed")}</Typography></Td>
                  <Td>
                    <Flex gap={2} alignItems="center">
                      <Typography>{duration(job)}</Typography>
                      {job.downloadable ? (
                        <Button variant="tertiary" onClick={() => void downloadArchive(job.documentId, job.filename || "export.zip")}>Download</Button>
                      ) : null}
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Flex>
  )
}
