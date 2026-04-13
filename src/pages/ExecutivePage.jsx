import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { DomainImpactMatrix, KpiCommandStrip, TrendBand } from '../components/domain/CommandCenterModules'
import { OverviewPage } from './OverviewPage'
import { Panel } from '../components/primitives/Primitives'
import { loadEventsData, loadProcessData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'

export function ExecutivePage() {
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
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'executive')))
  }, [])

  const kpiTiles = useMemo(() => {
    const kpis = processData?.kpis || []
    return kpis.map((kpi) => ({
      id: kpi.id,
      label: kpi.kpi || kpi.id,
      value: `${kpi.value ?? 'n/a'}`,
      status: kpi.status || 'unknown',
      score: kpi.status === 'violated' ? 92 : kpi.status === 'elevated' ? 75 : 48,
    }))
  }, [processData])

  const domainCells = useMemo(() => {
    const eventMatches = {
      Production: events.filter((event) => event.type?.includes('unit_processed')),
      Quality: events.filter((event) => event.type?.includes('inspection') || event.type?.includes('quality')),
      Logistics: events.filter((event) => event.order_id || event.serial_unit_id),
      Maintenance: events.filter((event) => event.type?.includes('maintenance') || event.type?.includes('disturbance')),
    }
    return Object.entries(eventMatches).map(([domain, domainEvents]) => ({
      domain,
      severity: domainEvents.length > 3 ? 'high' : domainEvents.length > 1 ? 'elevated' : 'watch',
      summary: `Incident evidence currently surfaces ${domainEvents.length} relevant events in ${domain.toLowerCase()}.`,
      entityCount: new Set(domainEvents.flatMap((entry) => [entry.asset_id, entry.station_id, entry.serial_unit_id, entry.order_id].filter(Boolean))).size,
      eventCount: domainEvents.filter((entry) => entry.type?.includes('disturbance') || entry.type?.includes('threshold')).length,
    }))
  }, [events])

  const trendRows = useMemo(() => {
    const breached = kpiTiles.filter((tile) => ['violated', 'critical', 'high'].some((entry) => `${tile.status}`.includes(entry))).length
    const riskySteps = (processData?.canvas?.steps || []).filter((step) => step.risk === 'high').length
    return [
      { label: 'KPI stress', value: breached ? 85 : 35, severity: breached ? 'critical' : 'watch', annotation: `${breached} breached KPI signals` },
      { label: 'Process disruption', value: riskySteps ? 78 : 30, severity: riskySteps > 2 ? 'high' : 'watch', annotation: `${riskySteps} high-risk steps` },
      { label: 'Event anomaly load', value: events.length > 8 ? 72 : 45, severity: events.length > 8 ? 'elevated' : 'normal', annotation: `${events.length} scoped events` },
    ]
  }, [events.length, kpiTiles, processData])

  return (
    <div className="stack">
      <h1>Executive Command Center</h1>
      <p className="meta">Management overview → issue detection → impact understanding → root-cause decisioning.</p>
      <DataDiagnostics diagnostics={diagnostics} />
      <KpiCommandStrip title="Incident KPI posture" tiles={kpiTiles} />
      <DomainImpactMatrix cells={domainCells} />
      <TrendBand rows={trendRows} />
      <Panel title="Executive command actions">
        <p className="meta">Direct the investigation using cross-space pivots tied to one incident truth.</p>
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/impact-analysis', globalContext, { mode: 'downstream-impact' })}>Open impact analysis</Link>
          <Link className="btn" to={toScopedPath('/production', globalContext)}>Open production workspace</Link>
          <Link className="btn" to={toScopedPath('/quality', globalContext)}>Open quality workspace</Link>
          <Link className="btn" to={toScopedPath('/maintenance', globalContext, { mode: 'upstream-cause' })}>Open maintenance root-cause</Link>
        </div>
      </Panel>
      <OverviewPage />
    </div>
  )
}
