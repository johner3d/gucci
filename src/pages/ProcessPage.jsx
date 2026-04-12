import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { Panel } from '../components/primitives/Primitives'
import { loadProcessData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'

const defaultContext = {
  plant: 'PLANT_DE_01',
  line: 'LINE_PAINT_A',
  time: '2026-01-15T06:00:00Z/2026-01-15T14:00:00Z',
  severity: 'high',
}

function toQueryString(params) {
  const next = new URLSearchParams(params)
  return `?${next.toString()}`
}

export function ProcessPage() {
  const [processData, setProcessData] = useState(null)
  const [diagnostics, setDiagnostics] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}

  const context = {
    plant: searchParams.get('plant') || defaultContext.plant,
    line: searchParams.get('line') || defaultContext.line,
    time: searchParams.get('time') || defaultContext.time,
    severity: searchParams.get('severity') || defaultContext.severity,
  }

  useEffect(() => {
    loadProcessData()
      .then((payload) => {
        setProcessData(payload)
        setDiagnostics(payload.diagnostics)
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'process')))
  }, [])

  const selectedStepId = searchParams.get('step')
  const highlightedId = searchParams.get('highlight') || ''

  const selectedStep = useMemo(() => {
    if (!processData?.canvas?.steps?.length) return null
    return processData.canvas.steps.find((step) => step.id === selectedStepId) || processData.canvas.steps[0]
  }, [processData, selectedStepId])

  const lanes = useMemo(() => {
    if (!processData?.canvas) return []
    return processData.canvas.lanes.map((lane) => ({
      ...lane,
      steps: processData.canvas.steps
        .filter((step) => step.lane_id === lane.id)
        .sort((a, b) => a.sequence - b.sequence),
    }))
  }, [processData])

  const related = useMemo(() => {
    if (!selectedStep || !processData) return null
    const events = processData.events.filter((event) => selectedStep.related.events.includes(event.id))
    const causalLinks = processData.relationships.filter((edge) => selectedStep.related.causal_links.includes(edge.id))
    const kpis = processData.kpis.filter((kpi) => selectedStep.related.kpis.includes(kpi.id))
    const lineageEvidence = processData.artifacts.filter((artifact) => selectedStep.related.lineage_evidence.includes(artifact.id))

    return { events, causalLinks, kpis, lineageEvidence }
  }, [selectedStep, processData])

  const breachedKpis = useMemo(() => {
    if (!processData?.kpis?.length) return []
    return processData.kpis.filter((kpi) => ['breach', 'violated', 'alert', 'critical'].some((token) => `${kpi.status}`.toLowerCase().includes(token)))
  }, [processData])

  if (!processData && !diagnostics.length) return <p>Loading process…</p>

  return (
    <div className="stack">
      <h1>Process</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      {processData ? (
        <>
          <Panel title="Process workspace interactions">
            <div className="button-row">
              <Link className="btn" to={toScopedPath('/events', globalContext, { step: selectedStep?.id || '' })}>Related events timeline</Link>
              <Link className="btn" to={toScopedPath('/graph', globalContext, { mode: 'dependency-chain' })}>Graph dependencies</Link>
              <Link className="btn" to={toScopedPath('/impact-analysis', globalContext, { step: selectedStep?.id || '' })}>Impact analysis</Link>
            </div>
          </Panel>
          <Panel title="Global context">
            <div className="meta">
              Plant <strong>{context.plant}</strong> | Line <strong>{context.line}</strong> | Time window <strong>{context.time}</strong> | Severity{' '}
              <strong>{context.severity}</strong>
            </div>
          </Panel>

          <Panel title="Lane-based process canvas">
            <p className="meta">Risk overlay legend: low (green), medium (amber), high (orange). Selected and highlighted steps stay synchronized with graph/events/lineage.</p>
            <div className="process-canvas">
              {lanes.map((lane) => (
                <section key={lane.id} className="process-lane">
                  <h3>{lane.name}</h3>
                  <ul className="list-reset process-lane-steps">
                    {lane.steps.map((step) => {
                      const isSelected = selectedStep?.id === step.id
                      const isHighlighted = highlightedId === step.id
                      return (
                        <li key={step.id}>
                          <button
                            type="button"
                            className={`process-step-card risk-${step.risk} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`.trim()}
                            onClick={() => setSearchParams({ ...context, step: step.id, highlight: step.id })}
                          >
                            <div className="process-step-header">
                              <strong>
                                {step.sequence}. {step.name}
                              </strong>
                              <span className="meta">{step.type}</span>
                            </div>
                            <div className="process-step-overlays">
                              <span className="chip">state: {step.state}</span>
                              <span className="chip">risk: {step.risk}</span>
                            </div>
                            <div className="meta">Transition: {step.state_transition}</div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </Panel>
          <Panel title="KPI breach communication">
            {!breachedKpis.length ? <p className="meta">No breached KPI observations in the active context.</p> : null}
            <ul className="row-list">
              {breachedKpis.map((kpi) => (
                <li key={kpi.id} className={highlightedId === kpi.id ? 'is-highlighted' : ''}>
                  <strong>{kpi.id}</strong> — {kpi.kpi}
                  <div className="meta">status {kpi.status} | value {String(kpi.value)}</div>
                  <div className="button-row">
                    <Link to={toScopedPath('/graph', globalContext, { focus: kpi.id, highlight: kpi.id })}>Graph causality</Link>
                    <Link to={toScopedPath('/events', globalContext, { correlatedOnly: true, highlight: kpi.id })}>Temporal events</Link>
                    <Link to={toScopedPath(`/object-explorer/${kpi.id}`, globalContext, { highlight: kpi.id })}>Entity semantic hub</Link>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          {selectedStep && related ? (
            <Panel title={`Step interactions — ${selectedStep.name}`}>
              <p className="meta">
                Interactions preserve context: plant={context.plant}, line={context.line}, time={context.time}, severity={context.severity}
              </p>

              <h3>Related events</h3>
              <ul className="row-list">
                {related.events.map((event) => (
                  <li key={event.id}>
                    <Link to={`/events${toQueryString({ ...context, event: event.id, step: selectedStep.id })}`}>
                      {event.id} — {event.type}
                    </Link>
                    <div className="meta">{event.occurred_at_utc}</div>
                  </li>
                ))}
              </ul>

              <h3>Impacted entities</h3>
              <ul className="row-list">
                {selectedStep.related.impacted_entities.map((entityId) => (
                  <li key={entityId}>
                    <Link to={`/object-explorer/${entityId}${toQueryString({ ...context, step: selectedStep.id })}`}>{entityId}</Link>
                  </li>
                ))}
              </ul>

              <h3>Causal links</h3>
              <ul className="row-list">
                {related.causalLinks.map((link) => (
                  <li key={link.id}>
                    <Link to={`/graph${toQueryString({ ...context, focus: link.source_id, mode: 'impact', step: selectedStep.id })}`}>
                      {link.id} — {link.source_id} {link.type} {link.target_id}
                    </Link>
                    <div className="meta">category {link.category} | confidence {link.qualifiers?.confidence ?? 'n/a'}</div>
                  </li>
                ))}
              </ul>

              <h3>KPIs</h3>
              <ul className="row-list">
                {related.kpis.map((kpi) => (
                  <li key={kpi.id}>
                    <Link to={`/object-explorer/${kpi.id}${toQueryString({ ...context, step: selectedStep.id })}`}>
                      {kpi.id} — {kpi.kpi}
                    </Link>
                    <div className="meta">status {kpi.status} | value {String(kpi.value)}</div>
                  </li>
                ))}
              </ul>

              <h3>Lineage evidence</h3>
              <ul className="row-list">
                {related.lineageEvidence.map((artifact) => (
                  <li key={artifact.id}>
                    <Link to={`/lineage/${artifact.id}${toQueryString({ ...context, step: selectedStep.id })}`}>
                      {artifact.id} — {artifact.rule_name}
                    </Link>
                    <div className="meta">{artifact.artifact_type}</div>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </>
      ) : (
        <p>Process content unavailable.</p>
      )}
    </div>
  )
}
