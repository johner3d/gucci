import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { DecisionActionCard, rankTrustLevel } from '../components/domain/DecisionActionCard'
import { DomainImpactMatrix, KpiCommandStrip, TrendBand } from '../components/domain/CommandCenterModules'
import { OverviewPage } from './OverviewPage'
import { Panel } from '../components/primitives/Primitives'
import { loadEntityWorkspaceData, loadEventsData, loadProcessData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'
import { OperationalStatus, Severity, toApprovedOperationalStatus } from '../domain/uiVocabulary'

export function ExecutivePage() {
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const [workspace, setWorkspace] = useState(null)
  const [events, setEvents] = useState([])
  const [processData, setProcessData] = useState(null)
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    Promise.all([loadEntityWorkspaceData(), loadEventsData(), loadProcessData()])
      .then(([entityPayload, eventsPayload, processPayload]) => {
        setWorkspace(entityPayload)
        setEvents(eventsPayload.events)
        setProcessData(processPayload)
        setDiagnostics([...entityPayload.diagnostics, ...eventsPayload.diagnostics, ...processPayload.diagnostics])
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'executive')))
  }, [])

  const kpiTiles = useMemo(() => {
    const kpis = processData?.kpis || []
    return kpis.map((kpi) => {
      const status = toApprovedOperationalStatus(kpi.status, OperationalStatus.WATCH)
      return {
        id: kpi.id,
        label: kpi.kpi || kpi.id,
        value: `${kpi.value ?? 'n/a'}`,
        status,
        score: status === OperationalStatus.VIOLATED ? 92 : status === OperationalStatus.ELEVATED ? 75 : 48,
      }
    })
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
      severity: domainEvents.length > 3 ? Severity.CRITICAL : domainEvents.length > 1 ? Severity.ELEVATED : Severity.WATCH,
      summary: `Incident evidence currently surfaces ${domainEvents.length} relevant events in ${domain.toLowerCase()}.`,
      entityCount: new Set(domainEvents.flatMap((entry) => [entry.asset_id, entry.station_id, entry.serial_unit_id, entry.order_id].filter(Boolean))).size,
      eventCount: domainEvents.filter((entry) => entry.type?.includes('disturbance') || entry.type?.includes('threshold')).length,
    }))
  }, [events])

  const trendRows = useMemo(() => {
    const breached = kpiTiles.filter((tile) => [OperationalStatus.VIOLATED].includes(tile.status)).length
    const riskySteps = (processData?.canvas?.steps || []).filter((step) => step.risk === 'high').length
    return [
      { label: 'KPI stress', value: breached ? 85 : 35, severity: breached ? Severity.CRITICAL : Severity.WATCH, annotation: `${breached} breached KPI signals` },
      { label: 'Process disruption', value: riskySteps ? 78 : 30, severity: riskySteps > 2 ? Severity.CRITICAL : Severity.WATCH, annotation: `${riskySteps} high-risk steps` },
      { label: 'Event anomaly load', value: events.length > 8 ? 72 : 45, severity: events.length > 8 ? Severity.ELEVATED : Severity.NORMAL, annotation: `${events.length} scoped events` },
    ]
  }, [events.length, kpiTiles, processData])

  const decisionPackages = useMemo(() => {
    const ownerByDomain = {
      Production: 'Production Director',
      Quality: 'Quality Director',
      Logistics: 'Logistics Director',
      Maintenance: 'Maintenance Director',
    }

    return domainCells.map((cell) => {
      const anchors = events
        .filter((event) => {
          if (cell.domain === 'Production') return event.type?.includes('unit_processed')
          if (cell.domain === 'Quality') return event.type?.includes('inspection') || event.type?.includes('quality')
          if (cell.domain === 'Logistics') return Boolean(event.order_id || event.serial_unit_id)
          if (cell.domain === 'Maintenance') return event.type?.includes('maintenance') || event.type?.includes('disturbance')
          return false
        })
        .slice(0, 3)
        .map((event) => event.id)

      return {
        domain: cell.domain,
        decisionStatement: `Approve ${cell.severity} containment plan for ${cell.domain}.`,
        businessImpact: `${cell.summary} ${cell.entityCount} entities are exposed and ${cell.eventCount} disruption signals require executive follow-through.`,
        owner: ownerByDomain[cell.domain] || 'Domain owner',
        timingExpectation: cell.severity === Severity.CRITICAL ? 'Issue decision in next 2 hours' : 'Issue decision in current shift',
        trustLevel: rankTrustLevel({ severity: cell.severity, evidenceAnchors: anchors }),
        evidenceAnchors: anchors,
      }
    })
  }, [domainCells, events])

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
      <Panel title="Decision summary by impacted domain">
        <p className="meta">Each investigation track closes with a reviewable decision-action package.</p>
        <div className="decision-action-grid">
          {decisionPackages.map((pack) => (
            <DecisionActionCard key={pack.domain} {...pack} />
          ))}
        </div>
      </Panel>
    </div>
  )
}
