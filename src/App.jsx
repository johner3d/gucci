import { Navigate, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { EventsPage } from './pages/EventsPage'
import { ExecutivePage } from './pages/ExecutivePage'
import { GraphPage } from './pages/GraphPage'
import { ImpactAnalysisPage } from './pages/ImpactAnalysisPage'
import { LineagePage } from './pages/LineagePage'
import { LogisticsPage } from './pages/LogisticsPage'
import { MaintenancePage } from './pages/MaintenancePage'
import { ObjectSearchPage } from './pages/ObjectSearchPage'
import { ObjectsPage } from './pages/ObjectsPage'
import { ProductionPage } from './pages/ProductionPage'
import { ProcessPage } from './pages/ProcessPage'
import { QualityPage } from './pages/QualityPage'

function LegacyObjectRedirect() {
  const { id } = useParams()
  const location = useLocation()
  return <Navigate to={`/object-explorer/${id}${location.search}`} replace />
}

function LineageRedirect() {
  const [searchParams] = useSearchParams()
  const artifactId = searchParams.get('lineageArtifact') || 'LIN_0039'
  return <Navigate to={`/lineage/${artifactId}?${searchParams.toString()}`} replace />
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/executive" replace />} />

      <Route element={<AppShell />}>
        <Route path="/executive" element={<ExecutivePage />} />
        <Route path="/production" element={<ProductionPage />} />
        <Route path="/quality" element={<QualityPage />} />
        <Route path="/logistics" element={<LogisticsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/process" element={<ProcessPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/object-explorer" element={<ObjectSearchPage />} />
        <Route path="/object-explorer/:id" element={<ObjectsPage />} />
        <Route path="/lineage" element={<LineageRedirect />} />
        <Route path="/lineage/:artifactId" element={<LineagePage />} />
        <Route path="/impact-analysis" element={<ImpactAnalysisPage />} />

        <Route path="/objects/search" element={<Navigate to="/object-explorer" replace />} />
        <Route path="/objects/:id" element={<LegacyObjectRedirect />} />

        <Route path="*" element={<Navigate to="/executive" replace />} />
      </Route>
    </Routes>
  )
}
