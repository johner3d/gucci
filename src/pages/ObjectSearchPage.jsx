import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { Panel } from '../components/primitives/Primitives'
import { loadEntityWorkspaceData, toUiDiagnostics } from '../lib/api'
import { toScopedQuery } from '../lib/contextKernel'

const defaultFilters = {
  type: 'all',
  domain: 'all',
  status: 'all',
  severity: 'all',
  time: 'all',
  provenance: 'all',
}

const timeFieldKeys = ['recorded_at_utc', 'occurred_at_utc', 'planned_start_utc', 'planned_end_utc', 'window_start_utc', 'window_end_utc']

function inferDomain(entityType = '') {
  if (['asset', 'maintenance_activity', 'station'].includes(entityType)) return 'operations'
  if (['production_order', 'serial_unit', 'line', 'plant', 'product', 'variant'].includes(entityType)) return 'production'
  if (['inspection', 'result'].includes(entityType)) return 'quality'
  if (entityType.includes('kpi')) return 'analytics'
  if (['process', 'subprocess', 'activity', 'work_step', 'decision_point', 'handoff', 'state_transition'].includes(entityType)) return 'process'
  return 'general'
}

function inferStatus(entity) {
  return entity.status || entity.result || entity.state || 'active'
}

function inferSeverity(entity, relatedRelationships = []) {
  if (entity.risk) return entity.risk
  if (entity.status && ['violated', 'completed_late', 'nok'].includes(String(entity.status).toLowerCase())) return 'high'
  const maxStrength = relatedRelationships.reduce((max, relationship) => Math.max(max, Number(relationship.qualifiers?.strength || 0)), 0)
  if (maxStrength > 0.8) return 'high'
  if (maxStrength > 0.6) return 'medium'
  return 'low'
}

function inferTimeBand(entity) {
  const timestamp = timeFieldKeys.map((key) => entity[key]).find(Boolean)
  if (!timestamp) return 'undated'
  const hour = new Date(timestamp).getUTCHours()
  if (hour < 8) return 'early'
  if (hour < 12) return 'mid'
  if (hour < 18) return 'late'
  return 'night'
}

function asScopedSearch(globalContext, patch = {}) {
  return toScopedQuery(globalContext, patch).toString()
}

export function ObjectSearchPage() {
  const [workspace, setWorkspace] = useState(null)
  const [diagnostics, setDiagnostics] = useState([])
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = {
    type: searchParams.get('type') || defaultFilters.type,
    domain: searchParams.get('domain') || defaultFilters.domain,
    status: searchParams.get('status') || defaultFilters.status,
    severity: searchParams.get('severityFacet') || defaultFilters.severity,
    time: searchParams.get('timeFacet') || defaultFilters.time,
    provenance: searchParams.get('provenance') || defaultFilters.provenance,
  }

  const pinned = (searchParams.get('pin') || '').split(',').filter(Boolean)
  const compared = (searchParams.get('compare') || '').split(',').filter(Boolean)

  useEffect(() => {
    loadEntityWorkspaceData()
      .then((payload) => {
        setWorkspace(payload)
        setDiagnostics(payload.diagnostics)
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'objects.search')))
  }, [])

  const enriched = useMemo(() => {
    if (!workspace) return []
    const bySourceId = workspace.sourceRepresentations.reduce((acc, source) => {
      if (!acc[source.represents_canonical_id]) acc[source.represents_canonical_id] = []
      acc[source.represents_canonical_id].push(source)
      return acc
    }, {})

    return workspace.entities.map((entity) => {
      const relatedRelationships = workspace.relationships.filter((relationship) => relationship.source_id === entity.id || relationship.target_id === entity.id)
      const provenance = (bySourceId[entity.id] || []).map((item) => item.source_system)
      return {
        ...entity,
        domain: inferDomain(entity.entity_type),
        statusFacet: inferStatus(entity),
        severityFacet: inferSeverity(entity, relatedRelationships),
        timeFacet: inferTimeBand(entity),
        provenanceFacet: provenance[0] || 'canonical_only',
      }
    })
  }, [workspace])

  const options = useMemo(() => {
    const optionSet = (key) => [...new Set(enriched.map((entry) => entry[key]).filter(Boolean))].sort()
    return {
      types: [...new Set(enriched.map((entry) => entry.entity_type))].sort(),
      domains: optionSet('domain'),
      statuses: optionSet('statusFacet'),
      severities: optionSet('severityFacet'),
      times: optionSet('timeFacet'),
      provenances: optionSet('provenanceFacet'),
    }
  }, [enriched])

  const filtered = useMemo(() => {
    return enriched.filter((entity) => {
      if (filters.type !== 'all' && entity.entity_type !== filters.type) return false
      if (filters.domain !== 'all' && entity.domain !== filters.domain) return false
      if (filters.status !== 'all' && String(entity.statusFacet) !== filters.status) return false
      if (filters.severity !== 'all' && entity.severityFacet !== filters.severity) return false
      if (filters.time !== 'all' && entity.timeFacet !== filters.time) return false
      if (filters.provenance !== 'all' && entity.provenanceFacet !== filters.provenance) return false
      return true
    })
  }, [enriched, filters])

  const updateFilter = (patch) => {
    const current = Object.fromEntries(searchParams.entries())
    setSearchParams({ ...current, ...patch })
  }

  const toggleListItem = (key, id) => {
    const current = (searchParams.get(key) || '').split(',').filter(Boolean)
    const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    updateFilter({ [key]: next.join(',') })
  }

  if (!workspace && !diagnostics.length) return <p>Loading object search workspace…</p>

  return (
    <div className="stack">
      <h1>Object Search Workspace</h1>
      <DataDiagnostics diagnostics={diagnostics} />

      <Panel title="Faceted search">
        <div className="timeline-filter-bar">
          <label>Type<select value={filters.type} onChange={(event) => updateFilter({ type: event.target.value })}><option value="all">All</option>{options.types.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label>Domain<select value={filters.domain} onChange={(event) => updateFilter({ domain: event.target.value })}><option value="all">All</option>{options.domains.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label>Status<select value={filters.status} onChange={(event) => updateFilter({ status: event.target.value })}><option value="all">All</option>{options.statuses.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label>Severity<select value={filters.severity} onChange={(event) => updateFilter({ severityFacet: event.target.value })}><option value="all">All</option>{options.severities.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label>Time<select value={filters.time} onChange={(event) => updateFilter({ timeFacet: event.target.value })}><option value="all">All</option>{options.times.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label>Provenance<select value={filters.provenance} onChange={(event) => updateFilter({ provenance: event.target.value })}><option value="all">All</option>{options.provenances.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        </div>
      </Panel>

      <Panel title={`Results (${filtered.length})`}>
        <ul className="row-list">
          {filtered.map((entity) => (
            <li key={entity.id}>
              <strong>{entity.id}</strong> <span className="chip">{entity.entity_type}</span> <span className="chip">{entity.domain}</span>
              <div className="meta">status {entity.statusFacet} | severity {entity.severityFacet} | time {entity.timeFacet} | provenance {entity.provenanceFacet}</div>
              <div className="button-row">
                <button type="button" className="btn" onClick={() => navigate(`/object-explorer/${entity.id}?${asScopedSearch(globalContext, { ...Object.fromEntries(searchParams.entries()), selectedEntity: entity.id })}`)}>Open entity detail</button>
                <button type="button" className="btn" onClick={() => toggleListItem('pin', entity.id)}>{pinned.includes(entity.id) ? 'Unpin' : 'Pin'}</button>
                <button type="button" className="btn" onClick={() => toggleListItem('compare', entity.id)}>{compared.includes(entity.id) ? 'Remove compare' : 'Compare'}</button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Pinned & compare basket">
        <p className="meta">Pinned: {pinned.join(', ') || 'none'} | Compare: {compared.join(', ') || 'none'}</p>
        {pinned.concat(compared).length ? (
          <div className="button-row">
            {[...new Set([...pinned, ...compared])].map((entityId) => (
              <Link key={entityId} className="btn" to={`/object-explorer/${entityId}?${asScopedSearch(globalContext, Object.fromEntries(searchParams.entries()))}`}>
                Open {entityId}
              </Link>
            ))}
          </div>
        ) : null}
      </Panel>
    </div>
  )
}
