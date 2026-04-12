import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
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

  const focus = searchParams.get('focus') || globalContext.focus || globalContext.focusEntity
  const impactingEdges = useMemo(() => toScoredEdges(graph.filter((edge) => edge.source_id === focus || edge.target_id === focus)).slice(0, 8), [focus, graph])
  const correlatedEvents = useMemo(
    () => events.filter((event) => Object.values(event).includes(focus) || event.type?.includes('kpi') || event.type?.includes('inspection')).slice(0, 10),
    [events, focus]
  )

  return (
    <div className="stack">
      <h1>Impact Analysis Workspace</h1>
      <p className="meta">Purpose-built impact scoring and evidence orchestration (independent from Graph workspace).</p>
      <DataDiagnostics diagnostics={diagnostics} />

      <Panel title={`Focus impact surface — ${focus}`}>
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/graph', globalContext, { focus, mode: 'downstream-impact' })}>Open causal graph</Link>
          <Link className="btn" to={toScopedPath('/events', globalContext, { correlatedOnly: true })}>Open correlated events</Link>
          <Link className="btn" to={toScopedPath('/lineage', globalContext, { lineageArtifact: artifacts[0]?.id || 'LIN_0039' })}>Open lineage proof</Link>
        </div>
      </Panel>

      <Panel title="Top scored impact edges">
        <ul className="row-list">
          {impactingEdges.map((edge) => (
            <li key={edge.id}>
              <strong>{edge.id}</strong> — {edge.source_id} {edge.type} {edge.target_id}
              <div className="meta">impact score {edge.impactScore} | confidence {edge.qualifiers?.confidence ?? 'n/a'} | strength {edge.qualifiers?.strength ?? 'n/a'}</div>
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
    </div>
  )
}
