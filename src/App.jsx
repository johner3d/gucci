import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { EventsPage } from './pages/EventsPage'
import { GraphPage } from './pages/GraphPage'
import { LineagePage } from './pages/LineagePage'
import { ObjectsPage } from './pages/ObjectsPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProcessPage } from './pages/ProcessPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/process" element={<ProcessPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/objects/:id" element={<ObjectsPage />} />
        <Route path="/lineage/:artifactId" element={<LineagePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
