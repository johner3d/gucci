import { DEFAULT_CONTEXT_KERNEL, toKernelQuery } from '../../lib/contextKernel'

export function IncidentTruthSelectors({ contextKernel, searchParams, setSearchParams }) {
  const scope = contextKernel.incidentScope || DEFAULT_CONTEXT_KERNEL.incidentScope

  const onPatch = (patch) => {
    const nextKernel = {
      ...contextKernel,
      ...patch,
      incidentScope: {
        ...scope,
        ...(patch.incidentScope || {}),
      },
    }
    setSearchParams(toKernelQuery(nextKernel, Object.fromEntries(searchParams.entries())))
  }

  return (
    <section className="context-bar stack">
      <strong>Global incident context</strong>
      <div className="button-row">
        <span className="chip">Incident: {scope.incidentId}</span>
        <span className="chip">Plant: {contextKernel.plant}</span>
        <span className="chip">Line: {contextKernel.line}</span>
        <span className="chip">Severity: {contextKernel.severity}</span>
        <span className="chip">Confidence: {contextKernel.confidence}</span>
        <span className="chip">Focus: {contextKernel.focusEntity}</span>
        {contextKernel.evidenceAnchor ? <span className="chip">Anchor: {contextKernel.evidenceAnchor}</span> : null}
      </div>
      <div className="timeline-filter-bar">
        <label>
          Incident ID
          <input value={scope.incidentId} onChange={(event) => onPatch({ incidentScope: { incidentId: event.target.value } })} />
        </label>
        <label>
          Focus entity
          <input value={contextKernel.focusEntity} onChange={(event) => onPatch({ focusEntity: event.target.value, focus: event.target.value })} />
        </label>
        <label>
          Severity
          <select value={contextKernel.severity} onChange={(event) => onPatch({ severity: event.target.value })}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </label>
        <label>
          Confidence
          <select value={contextKernel.confidence || 'supported'} onChange={(event) => onPatch({ confidence: event.target.value })}>
            <option value="unverified">unverified</option>
            <option value="provisional">provisional</option>
            <option value="supported">supported</option>
            <option value="high-confidence">high-confidence</option>
          </select>
        </label>
        <label>
          Reasoning stage
          <select value={contextKernel.stage || 'issue-detection'} onChange={(event) => onPatch({ stage: event.target.value })}>
            <option value="management-overview">management-overview</option>
            <option value="issue-detection">issue-detection</option>
            <option value="impact-understanding">impact-understanding</option>
            <option value="graph-deep-dive">graph-deep-dive</option>
            <option value="root-cause">root-cause</option>
            <option value="decision-support">decision-support</option>
          </select>
        </label>
      </div>
      <label>
        Hypothesis
        <input value={contextKernel.hypothesis} onChange={(event) => onPatch({ hypothesis: event.target.value, activeHypothesis: event.target.value })} />
      </label>
      <details>
        <summary className="meta">Advanced incident scope controls</summary>
        <label>
          Incident entities (comma separated)
          <input
            value={(scope.relatedEntityIds || []).join(',')}
            onChange={(event) => onPatch({ incidentScope: { relatedEntityIds: event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean) } })}
          />
        </label>
        <label>
          Incident event type prefixes (comma separated)
          <input
            value={(scope.eventTypePrefixes || []).join(',')}
            onChange={(event) => onPatch({ incidentScope: { eventTypePrefixes: event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean) } })}
          />
        </label>
      </details>
    </section>
  )
}
