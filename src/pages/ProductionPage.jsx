import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { TrendBand } from '../components/domain/CommandCenterModules'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { CtaButtonRow, Panel } from '../components/primitives/Primitives'
import { loadEventsData, loadProcessData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'
import { Severity } from '../domain/uiVocabulary'

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
  const lineDisruptionRows = useMemo(() => {
    const totalSteps = processData?.canvas?.steps?.length || 0
    const highRisk = (processData?.canvas?.steps || []).filter((step) => step.risk === 'high').length
    return [
      { label: 'Line throughput risk', value: productionEvents.length > 2 ? 72 : 45, severity: productionEvents.length > 2 ? Severity.ELEVATED : Severity.WATCH, annotation: `${productionEvents.length} units in scoped incident window` },
      { label: 'High-risk process steps', value: totalSteps ? (highRisk / totalSteps) * 100 : 0, severity: highRisk > 2 ? Severity.CRITICAL : Severity.WATCH, annotation: `${highRisk}/${totalSteps} steps flagged high risk` },
      { label: 'Recovery readiness', value: highRisk > 2 ? 40 : 68, severity: highRisk > 2 ? Severity.WATCH : Severity.NORMAL, annotation: highRisk > 2 ? 'Containment not stabilized' : 'Line stabilizing' },
    ]
  }, [processData, productionEvents.length])

  return (
    <div className="stack">
      <h1>Production Lens</h1>
      <p className="meta">Production continuity, throughput posture, and flow-aware mitigation.</p>
      <DataDiagnostics diagnostics={diagnostics} />
      <TrendBand rows={lineDisruptionRows} />
      <Panel title="Production recovery controls">
        <p className="meta">Units processed in scope: {productionEvents.length}</p>
        <CtaButtonRow
          actions={[
            { key: 'investigate', label: 'Investigate', to: toScopedPath('/events', globalContext, { domain: 'production' }) },
            { key: 'compare', label: 'Compare', to: toScopedPath('/impact-analysis', globalContext, { mode: 'downstream-impact' }) },
            { key: 'lineage', label: 'Explain lineage', to: toScopedPath('/lineage/LIN_0039', globalContext) },
            { key: 'export', label: 'Export', to: toScopedPath('/production', globalContext, { export: 'brief' }) },
          ]}
        />
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
