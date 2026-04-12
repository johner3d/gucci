import { Navigate, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Panel } from './components/primitives/Primitives'
import { EventsPage } from './pages/EventsPage'
import { GraphPage } from './pages/GraphPage'
import { LineagePage } from './pages/LineagePage'
import { ObjectSearchPage } from './pages/ObjectSearchPage'
import { ObjectsPage } from './pages/ObjectsPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProcessPage } from './pages/ProcessPage'

function SpacePlaceholder({ title, description }) {
  return (
    <Panel
      title={title}
      nextActions={[
        { label: 'Open Events', to: '/events' },
        { label: 'Open Graph', to: '/graph' },
        { label: 'Open Impact Analysis', to: '/impact-analysis' },
      ]}
    >
      <p className="meta">{description}</p>
    </Panel>
  )
}

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
        <Route path="/executive" element={<OverviewPage />} />
        <Route path="/production" element={<ProcessPage />} />
        <Route path="/quality" element={<EventsPage />} />
        <Route
          path="/logistics"
          element={<SpacePlaceholder title="Logistics" description="Track material flow, handoffs, and shipment readiness under the active investigation context." />}
        />
        <Route
          path="/maintenance"
          element={<SpacePlaceholder title="Maintenance" description="Review maintenance orders, asset health, and interventions linked to current impact hypotheses." />}
        />
        <Route path="/process" element={<ProcessPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/object-explorer" element={<ObjectSearchPage />} />
        <Route path="/object-explorer/:id" element={<ObjectsPage />} />
        <Route path="/lineage" element={<LineageRedirect />} />
        <Route path="/lineage/:artifactId" element={<LineagePage />} />
        <Route path="/impact-analysis" element={<GraphPage />} />

        <Route path="/objects/search" element={<Navigate to="/object-explorer" replace />} />
        <Route path="/objects/:id" element={<LegacyObjectRedirect />} />

        <Route path="*" element={<Navigate to="/executive" replace />} />
      </Route>
    </Routes>
  )
}
