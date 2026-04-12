import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { Panel } from '../components/primitives/Primitives'
import { loadEntityWorkspaceData, loadEventsData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'

export function LogisticsPage() {
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const [workspace, setWorkspace] = useState(null)
  const [events, setEvents] = useState([])
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    Promise.all([loadEntityWorkspaceData(), loadEventsData()])
      .then(([entityPayload, eventsPayload]) => {
        setWorkspace(entityPayload)
        setEvents(eventsPayload.events)
        setDiagnostics([...entityPayload.diagnostics, ...eventsPayload.diagnostics])
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'logistics')))
  }, [])

  const logisticsEntities = useMemo(
    () => (workspace?.entities || []).filter((entry) => ['production_order', 'serial_unit', 'batch_lot'].includes(entry.entity_type)),
    [workspace]
  )
  const flowEvents = useMemo(() => events.filter((event) => event.type?.includes('unit_processed')), [events])

  return (
    <div className="stack">
      <h1>Logistics Workspace</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      <Panel title="Material flow control center">
        <p className="meta">Active logistics entities in incident scope: {logisticsEntities.length}</p>
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/events', globalContext, { domain: 'production' })}>Track flow events</Link>
          <Link className="btn" to={toScopedPath('/graph', globalContext, { mode: 'downstream-impact' })}>Graph handoff impacts</Link>
          <Link className="btn" to={toScopedPath('/impact-analysis', globalContext, { relationshipClass: 'business' })}>Logistics impact analysis</Link>
        </div>
      </Panel>
      <Panel title="Recent flow events">
        <ul className="row-list">
          {flowEvents.map((event) => (
            <li key={event.id}>
              {event.id} — {event.type}
              <div className="button-row">
                <Link to={toScopedPath('/events', globalContext, { event: event.id })}>Event detail</Link>
                <Link to={toScopedPath('/object-explorer', globalContext, { selectedEntity: event.serial_unit_id || event.order_id || '' })}>Entity detail</Link>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
