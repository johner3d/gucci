import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { Panel } from '../components/primitives/Primitives'
import { loadEventsData, loadLineageArtifactsData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'

export function QualityPage() {
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const [events, setEvents] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    Promise.all([loadEventsData(), loadLineageArtifactsData()])
      .then(([eventsPayload, lineagePayload]) => {
        setEvents(eventsPayload.events)
        setArtifacts(lineagePayload.artifacts)
        setDiagnostics([...eventsPayload.diagnostics, ...lineagePayload.diagnostics])
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'quality')))
  }, [])

  const qualityEvents = useMemo(() => events.filter((event) => event.type?.includes('inspection') || event.type?.includes('quality')), [events])

  return (
    <div className="stack">
      <h1>Quality Workspace</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      <Panel title="Quality investigation links">
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/events', globalContext, { eventClass: 'quality', correlatedOnly: true })}>Timeline quality lane</Link>
          <Link className="btn" to={toScopedPath('/lineage', globalContext, { lineageArtifact: artifacts[0]?.id || 'LIN_0039' })}>Open lineage evidence</Link>
          <Link className="btn" to={toScopedPath('/impact-analysis', globalContext, { mode: 'upstream-cause' })}>Run impact analysis</Link>
        </div>
      </Panel>
      <Panel title="Inspection and quality events">
        <ul className="row-list">
          {qualityEvents.map((event) => (
            <li key={event.id}>
              <strong>{event.id}</strong> — {event.type}
              <div className="meta">{event.occurred_at_utc}</div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
