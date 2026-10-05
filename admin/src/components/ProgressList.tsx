import { Box, Flex, Typography } from "@strapi/design-system"
import type { ProgressBucket } from "../services/api"

const LABELS: Record<string, string> = {
  contentTypes: "Content Types",
  entries: "Entries",
  components: "Components",
  media: "Media",
  relations: "Relations",
}

const percent = (bucket?: ProgressBucket) => {
  if (!bucket || bucket.total <= 0) {
    return 0
  }
  return Math.min(100, Math.round((bucket.done / bucket.total) * 100))
}

export const ProgressList = ({ progress }: { progress?: Record<string, ProgressBucket> | null }) => {
  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      {Object.keys(LABELS).map((key) => {
        const value = percent(progress?.[key])
        return (
          <Flex key={key} direction="column" alignItems="stretch" gap={1}>
            <Flex justifyContent="space-between">
              <Typography variant="pi" fontWeight="bold">
                {LABELS[key]}
              </Typography>
              <Typography variant="pi">{value}%</Typography>
            </Flex>
            <Box background="neutral200" hasRadius style={{ height: 8, overflow: "hidden", width: "100%" }}>
              <Box
                background="success600"
                hasRadius
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={LABELS[key]}
                style={{ height: "100%", width: `${value}%` }}
              />
            </Box>
          </Flex>
        )
      })}
    </Flex>
  )
}
