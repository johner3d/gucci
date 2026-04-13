import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { ProcessRiskBoard, TrendBand } from '../components/domain/CommandCenterModules'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { DecisionActionCard, rankTrustLevel } from '../components/domain/DecisionActionCard'
import { CtaButtonRow, Panel, StatePanel } from '../components/primitives/Primitives'
import { loadProcessData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'
import { Severity, toApprovedSeverity } from '../domain/uiVocabulary'

const defaultContext = {
  plant: 'PLANT_DE_01',
  line: 'LINE_PAINT_A',
  time: '2026-01-15T06:00:00Z/2026-01-15T14:00:00Z',
  severity: Severity.CRITICAL,
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
    severity: toApprovedSeverity(searchParams.get('severity') || defaultContext.severity, defaultContext.severity),
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
  const evidenceAnchor = searchParams.get('anchor') || globalContext.anchor || ''

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

  const processTrendRows = useMemo(() => {
    const steps = processData?.canvas?.steps || []
    const highRisk = steps.filter((step) => step.risk === 'high').length
    const handoffs = steps.filter((step) => step.type === 'handoff' || step.type === 'state_transition').length
    return [
      { label: 'Process disruption pressure', value: steps.length ? (highRisk / steps.length) * 100 : 0, severity: highRisk > 2 ? Severity.CRITICAL : Severity.WATCH, annotation: `${highRisk}/${steps.length} steps high risk` },
      { label: 'Handoff vulnerability', value: handoffs ? Math.min(90, handoffs * 25) : 20, severity: handoffs > 1 ? Severity.ELEVATED : Severity.NORMAL, annotation: `${handoffs} handoff/state transition steps` },
      { label: 'KPI breach coupling', value: breachedKpis.length ? Math.min(95, breachedKpis.length * 30) : 25, severity: breachedKpis.length ? Severity.CRITICAL : Severity.NORMAL, annotation: `${breachedKpis.length} breached KPI observations` },
    ]
  }, [breachedKpis.length, processData])

  const processRiskRows = useMemo(() => {
    const steps = processData?.canvas?.steps || []
    return steps
      .filter((step) => step.risk === 'high' || ['handoff', 'decision_point', 'state_transition'].includes(step.type))
      .slice(0, 6)
      .map((step) => ({
        id: step.id,
        label: `${step.sequence}. ${step.name}`,
        lane: step.lane_id,
        severity: step.risk === 'high' ? Severity.CRITICAL : Severity.ELEVATED,
        rationale: step.state_transition || step.type,
      }))
  }, [processData])

  const decisionPackages = useMemo(() => {
    if (!lanes.length) return []
    return lanes.map((lane) => {
      const highRiskSteps = lane.steps.filter((step) => step.risk === 'high')
      const anchors = lane.steps.map((step) => step.id).slice(0, 2)
      const selectedAnchors = selectedStep?.lane_id === lane.id && related
        ? [...anchors, ...(related.events || []).map((event) => event.id).slice(0, 1)]
        : anchors
      const severity = highRiskSteps.length ? Severity.CRITICAL : Severity.WATCH
      return {
        domain: lane.name,
        decisionStatement: `Authorize ${lane.name.toLowerCase()} execution guardrails for the next operating window.`,
        businessImpact: `${highRiskSteps.length} high-risk steps are active in this lane and require explicit operational ownership.`,
        owner: `${lane.name} lane owner`,
        timingExpectation: highRiskSteps.length ? 'Decision needed before next handoff checkpoint' : 'Decision needed in daily standup',
        trustLevel: rankTrustLevel({ severity, evidenceAnchors: selectedAnchors }),
        evidenceAnchors: selectedAnchors,
      }
    })
  }, [lanes, related, selectedStep])

  if (!processData && !diagnostics.length) return <StatePanel state="loading" title="Loading process" />

  return (
    <div className="stack">
      <h1>Process</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      {processData ? (
        <>
          <TrendBand rows={processTrendRows} />
          <ProcessRiskBoard rows={processRiskRows} />
          <Panel title="Process workspace interactions">
            <CtaButtonRow
              actions={[
                { key: 'investigate', label: 'Investigate', to: toScopedPath('/events', globalContext, { step: selectedStep?.id || '' }) },
                { key: 'compare', label: 'Compare', to: toScopedPath('/impact-analysis', globalContext, { step: selectedStep?.id || '' }) },
                { key: 'lineage', label: 'Explain lineage', to: toScopedPath('/lineage/LIN_0039', globalContext, { step: selectedStep?.id || '' }) },
                { key: 'export', label: 'Export', to: toScopedPath('/process', globalContext, { export: 'brief' }) },
              ]}
            />
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
                            onClick={() => setSearchParams({ ...context, ...Object.fromEntries(searchParams.entries()), step: step.id, highlight: step.id, anchor: step.id })}
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
                    <Link to={toScopedPath('/graph', globalContext, { focusEntity: kpi.id, highlight: kpi.id, anchor: kpi.id })}>Graph causality</Link>
                    <Link to={toScopedPath('/events', globalContext, { correlatedOnly: true, highlight: kpi.id, anchor: kpi.id })}>Temporal events</Link>
                    <Link to={toScopedPath(`/object-explorer/${kpi.id}`, globalContext, { highlight: kpi.id, anchor: kpi.id })}>Entity semantic hub</Link>
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
              {evidenceAnchor ? <p className="meta">Active evidence anchor: {evidenceAnchor}</p> : null}

              <h3>Related events</h3>
              <ul className="row-list">
                {related.events.map((event) => (
                  <li key={event.id}>
                    <Link to={`/events${toQueryString({ ...context, event: event.id, step: selectedStep.id, anchor: event.id })}`}>
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
                    <Link to={`/object-explorer/${entityId}${toQueryString({ ...context, step: selectedStep.id, anchor: entityId })}`}>{entityId}</Link>
                  </li>
                ))}
              </ul>

              <h3>Causal links</h3>
              <ul className="row-list">
                {related.causalLinks.map((link) => (
                  <li key={link.id}>
                    <Link to={`/graph${toQueryString({ ...context, focusEntity: link.source_id, mode: 'impact', step: selectedStep.id, anchor: link.id, highlight: link.id })}`}>
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
                    <Link to={`/object-explorer/${kpi.id}${toQueryString({ ...context, step: selectedStep.id, anchor: kpi.id })}`}>
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
                    <Link to={`/lineage/${artifact.id}${toQueryString({ ...context, step: selectedStep.id, anchor: artifact.id, highlight: artifact.id })}`}>
                      {artifact.id} — {artifact.rule_name}
                    </Link>
                    <div className="meta">{artifact.artifact_type}</div>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
          <Panel title="Decision summary by impacted domain">
            <p className="meta">Process review closes with a domain-by-domain decision package for execution tracking.</p>
            <div className="decision-action-grid">
              {decisionPackages.map((pack) => (
                <DecisionActionCard key={pack.domain} {...pack} />
              ))}
            </div>
          </Panel>
        </>
      ) : (
        <StatePanel state="empty" title="Process content unavailable" />
      )}
    </div>
  )
}
