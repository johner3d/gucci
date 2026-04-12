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
      <strong>Incident truth selectors</strong>
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
      </div>
      <label>
        Hypothesis
        <input value={contextKernel.hypothesis} onChange={(event) => onPatch({ hypothesis: event.target.value, activeHypothesis: event.target.value })} />
      </label>
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
    </section>
  )
}
