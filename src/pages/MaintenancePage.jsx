import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { KpiCommandStrip, TrendBand } from '../components/domain/CommandCenterModules'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { Panel } from '../components/primitives/Primitives'
import { loadEntityWorkspaceData, loadEventsData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'

export function MaintenancePage() {
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
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'maintenance')))
  }, [])

  const maintenanceAssets = useMemo(
    () => (workspace?.entities || []).filter((entry) => ['asset', 'maintenance_activity', 'station'].includes(entry.entity_type)),
    [workspace]
  )
  const maintenanceEvents = useMemo(() => events.filter((event) => event.type?.includes('maintenance') || event.type?.includes('disturbance')), [events])
  const maintenanceTiles = useMemo(
    () => [
      { id: 'tracked-assets', label: 'Tracked assets/activities', value: String(maintenanceAssets.length), status: maintenanceAssets.length > 4 ? 'elevated' : 'watch', score: maintenanceAssets.length > 4 ? 70 : 46 },
      { id: 'disturbance-events', label: 'Disturbance events', value: String(maintenanceEvents.filter((event) => event.type?.includes('disturbance')).length), status: maintenanceEvents.some((event) => event.type?.includes('disturbance')) ? 'high' : 'normal', score: maintenanceEvents.some((event) => event.type?.includes('disturbance')) ? 88 : 35 },
    ],
    [maintenanceAssets.length, maintenanceEvents]
  )
  const maintenanceTrend = useMemo(
    () => [
      {
        label: 'Asset disturbance risk',
        value: maintenanceEvents.some((event) => event.type?.includes('disturbance')) ? 82 : 38,
        severity: maintenanceEvents.some((event) => event.type?.includes('disturbance')) ? 'high' : 'normal',
        annotation: `${maintenanceEvents.length} maintenance-linked events in scope`,
      },
      {
        label: 'Intervention readiness',
        value: maintenanceAssets.length > 4 ? 62 : 74,
        severity: maintenanceAssets.length > 4 ? 'watch' : 'normal',
        annotation: maintenanceAssets.length > 4 ? 'High maintenance load detected' : 'Load currently manageable',
      },
    ],
    [maintenanceAssets.length, maintenanceEvents]
  )

  return (
    <div className="stack">
      <h1>Maintenance Lens</h1>
      <p className="meta">Asset reliability, disturbance chains, and intervention sequencing.</p>
      <DataDiagnostics diagnostics={diagnostics} />
      <KpiCommandStrip title="Maintenance risk strip" tiles={maintenanceTiles} />
      <TrendBand rows={maintenanceTrend} />
      <Panel title="Asset health and intervention">
        <p className="meta">Tracked maintenance entities: {maintenanceAssets.length}</p>
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/events', globalContext, { domain: 'asset', anomaliesOnly: true })}>View maintenance anomalies</Link>
          <Link className="btn" to={toScopedPath('/process', globalContext)}>Process mitigations</Link>
          <Link className="btn" to={toScopedPath('/graph', globalContext, { mode: 'upstream-cause' })}>Root-cause graph</Link>
        </div>
      </Panel>
      <Panel title="Maintenance and disturbance events">
        <ul className="row-list">
          {maintenanceEvents.map((event) => (
            <li key={event.id}>
              {event.id} — {event.type} — {event.asset_id || event.station_id || 'unbound'}
              <div className="button-row">
                <Link to={toScopedPath('/events', globalContext, { event: event.id })}>Timeline</Link>
                <Link to={toScopedPath('/lineage', globalContext, { sourceEvent: event.id })}>Lineage evidence</Link>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
