import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { Panel } from '../components/primitives/Primitives'
import { loadEventsData, loadProcessData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'

export function ProductionPage() {
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const [events, setEvents] = useState([])
  const [processData, setProcessData] = useState(null)
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    Promise.all([loadEventsData(), loadProcessData()])
      .then(([eventsPayload, processPayload]) => {
        setEvents(eventsPayload.events)
        setProcessData(processPayload)
        setDiagnostics([...eventsPayload.diagnostics, ...processPayload.diagnostics])
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'production')))
  }, [])

  const productionEvents = useMemo(() => events.filter((event) => event.type?.includes('unit_processed')), [events])

  return (
    <div className="stack">
      <h1>Production Workspace</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      <Panel title="Production recovery controls">
        <p className="meta">Units processed in scope: {productionEvents.length}</p>
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/process', globalContext, { step: processData?.canvas?.steps?.[0]?.id || '' })}>Open process control</Link>
          <Link className="btn" to={toScopedPath('/events', globalContext, { domain: 'production' })}>Open production events</Link>
          <Link className="btn" to={toScopedPath('/graph', globalContext, { mode: 'dependency-chain' })}>Open dependency graph</Link>
        </div>
      </Panel>
      <Panel title="Impacted production events">
        <ul className="row-list">
          {productionEvents.map((event) => (
            <li key={event.id}>
              {event.id} — {event.type} ({event.serial_unit_id || event.order_id || 'n/a'})
              <div className="button-row">
                <Link to={toScopedPath('/events', globalContext, { event: event.id })}>Events</Link>
                <Link to={toScopedPath('/process', globalContext, { event: event.id })}>Process</Link>
                <Link to={toScopedPath('/object-explorer', globalContext, { selectedEntity: event.serial_unit_id || event.order_id || '' })}>Object Explorer</Link>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
