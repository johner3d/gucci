import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { DecisionActionCard, rankTrustLevel } from '../components/domain/DecisionActionCard'
import { Panel } from '../components/primitives/Primitives'
import { loadEventsData, loadGraphData, loadLineageArtifactsData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'

function toScoredEdges(edges = []) {
  return edges
    .map((edge) => ({
      ...edge,
      impactScore: Number(((Number(edge.qualifiers?.confidence || 0) * 0.6 + Number(edge.qualifiers?.strength || 0) * 0.4) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.impactScore - a.impactScore)
}

function inferDomain(tokens = []) {
  const normalized = tokens.join(' ').toLowerCase()
  if (normalized.includes('inspection') || normalized.includes('quality')) return 'Quality'
  if (normalized.includes('maintenance') || normalized.includes('disturbance') || normalized.includes('asset')) return 'Maintenance'
  if (normalized.includes('order') || normalized.includes('shipment') || normalized.includes('logistics')) return 'Logistics'
  return 'Production'
}

export function ImpactAnalysisPage() {
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const [searchParams] = useSearchParams()
  const [graph, setGraph] = useState([])
  const [events, setEvents] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    Promise.all([loadGraphData(), loadEventsData(), loadLineageArtifactsData()])
      .then(([graphPayload, eventsPayload, lineagePayload]) => {
        setGraph(graphPayload.relationships)
        setEvents(eventsPayload.events)
        setArtifacts(lineagePayload.artifacts)
        setDiagnostics([...graphPayload.diagnostics, ...eventsPayload.diagnostics, ...lineagePayload.diagnostics])
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'impact-analysis')))
  }, [])

  const focus = searchParams.get('focusEntity') || searchParams.get('focus') || globalContext.focusEntity
  const highlightedId = searchParams.get('highlight') || ''
  const impactingEdges = useMemo(() => toScoredEdges(graph.filter((edge) => edge.source_id === focus || edge.target_id === focus)).slice(0, 8), [focus, graph])
  const breachSignals = useMemo(
    () => events.filter((event) => ['threshold', 'violation', 'disturbance', 'kpi'].some((token) => `${event.type}`.toLowerCase().includes(token))).slice(0, 6),
    [events]
  )
  const correlatedEvents = useMemo(
    () => events.filter((event) => Object.values(event).includes(focus) || event.type?.includes('kpi') || event.type?.includes('inspection')).slice(0, 10),
    [events, focus]
  )
  const decisionPackages = useMemo(() => {
    const packageMap = new Map()
    impactingEdges.forEach((edge) => {
      const domain = inferDomain([edge.source_id, edge.target_id, edge.type])
      const existing = packageMap.get(domain) || { anchors: [], score: 0 }
      packageMap.set(domain, {
        anchors: [...existing.anchors, edge.id].slice(0, 3),
        score: Math.max(existing.score, edge.impactScore),
      })
    })

    correlatedEvents.forEach((event) => {
      const domain = inferDomain([event.type, event.asset_id, event.order_id, event.station_id])
      const existing = packageMap.get(domain) || { anchors: [], score: 0 }
      packageMap.set(domain, {
        anchors: [...existing.anchors, event.id].slice(0, 3),
        score: existing.score,
      })
    })

    return [...packageMap.entries()].map(([domain, info]) => ({
      domain,
      decisionStatement: `Confirm ${domain.toLowerCase()} mitigation sequence from the scored impact chain.`,
      businessImpact: `${domain} shows high downstream exposure in the focused analysis path, demanding a communicated action package before handoff.`,
      owner: `${domain} domain lead`,
      timingExpectation: info.score >= 70 ? 'Finalize mitigation in next 4 hours' : 'Finalize mitigation before next operations review',
      trustLevel: rankTrustLevel({ severity: info.score >= 70 ? 'critical' : 'watch', evidenceAnchors: info.anchors }),
      evidenceAnchors: info.anchors,
    }))
  }, [correlatedEvents, impactingEdges])

  return (
    <div className="stack">
      <h1>Impact Analysis Workspace</h1>
      <p className="meta">Purpose-built impact scoring and evidence orchestration (independent from Graph workspace).</p>
      <DataDiagnostics diagnostics={diagnostics} />

      <Panel title={`Focus impact surface — ${focus}`}>
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/graph', globalContext, { focusEntity: focus, mode: 'downstream-impact' })}>Open causal graph</Link>
          <Link className="btn" to={toScopedPath('/events', globalContext, { correlatedOnly: true })}>Open correlated events</Link>
          <Link className="btn" to={toScopedPath('/lineage', globalContext, { lineageArtifact: artifacts[0]?.id || 'LIN_0039' })}>Open lineage proof</Link>
        </div>
      </Panel>

      <Panel title="Top scored impact edges">
        <ul className="row-list">
          {impactingEdges.map((edge) => (
            <li key={edge.id} className={highlightedId === edge.id ? 'is-highlighted' : ''}>
              <strong>{edge.id}</strong> — {edge.source_id} {edge.type} {edge.target_id}
              <div className="meta">impact score {edge.impactScore} | confidence {edge.qualifiers?.confidence ?? 'n/a'} | strength {edge.qualifiers?.strength ?? 'n/a'}</div>
              <div className="button-row">
                <Link to={toScopedPath('/graph', globalContext, { focusEntity: edge.source_id, highlight: edge.id })}>Graph path</Link>
                <Link to={toScopedPath('/process', globalContext, { highlight: edge.target_id })}>Process lane</Link>
                <Link to={toScopedPath(`/object-explorer/${edge.target_id}`, globalContext, { highlight: edge.id })}>Entity hub</Link>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="KPI breach communication">
        <ul className="row-list">
          {breachSignals.map((event) => (
            <li key={event.id} className={highlightedId === event.id ? 'is-highlighted' : ''}>
              <strong>{event.id}</strong> — {event.type}
              <div className="meta">{event.occurred_at_utc}</div>
              <div className="button-row">
                <Link to={toScopedPath('/events', globalContext, { highlight: event.id, event: event.id })}>Open temporal track</Link>
                <Link to={toScopedPath('/graph', globalContext, { focusEntity: event.kpi_observation_id || focus, highlight: event.id })}>Open causality path</Link>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Correlated event evidence">
        <ul className="row-list">
          {correlatedEvents.map((event) => (
            <li key={event.id}>
              {event.id} — {event.type}
              <div className="button-row">
                <Link to={toScopedPath('/events', globalContext, { event: event.id })}>Event timeline</Link>
                <Link to={toScopedPath('/process', globalContext, { event: event.id })}>Process context</Link>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Decision summary by impacted domain">
        <p className="meta">Impact scoring output is translated into domain-owned action packages for review and sign-off.</p>
        <div className="decision-action-grid">
          {decisionPackages.map((pack) => (
            <DecisionActionCard key={pack.domain} {...pack} />
          ))}
        </div>
      </Panel>
    </div>
  )
}
