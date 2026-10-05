import { NavLink, Navigate, Route, Routes } from "react-router-dom"
import { Box, SubNav, SubNavHeader, SubNavLink, SubNavSections } from "@strapi/design-system"
import { Layouts, Page } from "@strapi/strapi/admin"
import { ExportPage } from "./ExportPage"
import { HistoryPage } from "./HistoryPage"
import { ImportPage } from "./ImportPage"

const App = () => {
  return (
    <Layouts.Root
      sideNav={
        <SubNav aria-label="Import and export">
          <SubNavHeader label="Import / Export" />
          <SubNavSections>
            <SubNavLink tag={NavLink} to="export">Export</SubNavLink>
            <SubNavLink tag={NavLink} to="import">Import</SubNavLink>
            <SubNavLink tag={NavLink} to="history">History</SubNavLink>
          </SubNavSections>
        </SubNav>
      }
    >
      <Page.Title>Import / Export</Page.Title>
      <Layouts.Header title="Import / Export" subtitle="Schema-driven transfer between Strapi 5 environments" />
      <Layouts.Content>
        <Box paddingBottom={8}>
          <Routes>
            <Route index element={<Navigate to="export" replace />} />
            <Route path="export" element={<ExportPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="*" element={<Page.Error />} />
          </Routes>
        </Box>
      </Layouts.Content>
    </Layouts.Root>
  )
}

export default App
