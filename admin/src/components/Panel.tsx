import { Box, Flex, Typography } from "@strapi/design-system"
import type { ReactNode } from "react"

export const Panel = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => {
  return (
    <Box padding={5} background="neutral0" hasRadius shadow="filterShadow">
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Box>
          <Typography variant="delta">{title}</Typography>
          {hint ? (
            <Box marginTop={1}>
              <Typography variant="pi" textColor="neutral600">{hint}</Typography>
            </Box>
          ) : null}
        </Box>
        {children}
      </Flex>
    </Box>
  )
}
