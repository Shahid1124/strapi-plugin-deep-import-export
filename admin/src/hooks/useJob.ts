import * as React from "react"
import { useFetchClient } from "@strapi/strapi/admin"
import { api, type Job } from "../services/api"

export const useJob = (id: string | null) => {
  const client = useFetchClient()
  const clientRef = React.useRef(client)
  clientRef.current = client
  const [job, setJob] = React.useState<Job | null>(null)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!id) {
      setJob(null)
      return undefined
    }
    let stopped = false
    let timer = 0
    const load = async () => {
      try {
        const next = await api(clientRef.current).status(id)
        if (stopped) {
          return
        }
        setJob(next)
        setError("")
        if (next.state === "completed" || next.state === "failed") {
          window.clearInterval(timer)
        }
      } catch (cause) {
        if (!stopped) {
          setError(cause instanceof Error ? cause.message : "Could not read job status.")
        }
      }
    }
    void load()
    timer = window.setInterval(() => {
      void load()
    }, 1000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [id])

  return { job, error }
}
