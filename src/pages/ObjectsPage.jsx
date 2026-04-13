import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { EvidenceAnchorPanel } from '../components/domain/EvidenceAnchorPanel'
import { EventTimeline } from '../components/domain/EventTimeline'
import { Panel, StatePanel } from '../components/primitives/Primitives'
import { loadEntityWorkspaceData, toUiDiagnostics } from '../lib/api'
import { captureLatencyHook } from '../lib/qaTelemetry'
import { toScopedPath } from '../lib/scopedLink'

function toTypeLabel(type = '') {
  return type.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function asArrayParam(searchParams, key) {
  return (searchParams.get(key) || '').split(',').filter(Boolean)
}

function toSearch(searchParams, patch) {
  const next = new URLSearchParams(searchParams)
  Object.entries(patch).forEach(([key, value]) => next.set(key, value))
  return next.toString()
}

export function ObjectsPage() {
  const { id } = useParams()
  const [workspace, setWorkspace] = useState(null)
  const [diagnostics, setDiagnostics] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}

  useEffect(() => {
    loadEntityWorkspaceData()
      .then((payload) => {
        setWorkspace(payload)
        setDiagnostics(payload.diagnostics)
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, `objects.${id}`)))
  }, [id])

  const entity = useMemo(() => workspace?.entities?.find((candidate) => candidate.id === id) || null, [workspace, id])

  useEffect(() => {
    if (!entity) return
    captureLatencyHook('object.hydration', { entityId: entity.id })
  }, [entity])

  const relationships = useMemo(() => {
    if (!workspace || !id) return []
    return workspace.relationships.filter((relationship) => relationship.source_id === id || relationship.target_id === id)
  }, [workspace, id])

  const relatedEvents = useMemo(() => {
    if (!workspace || !id) return []
    return workspace.events.filter((event) => Object.values(event).includes(id))
  }, [workspace, id])

  const sourceRepresentations = useMemo(() => {
    if (!workspace || !id) return []
    return workspace.sourceRepresentations.filter((source) => source.represents_canonical_id === id)
  }, [workspace, id])

  const semantics = useMemo(() => {
    if (!workspace || !id) return null
    const semantic = workspace.semantics[id]
    if (!semantic) return null

    const ontologyClasses = workspace.ontologyClasses.filter((entry) => semantic.ontology_class_ids.includes(entry.id))
    const taxonomyNodeIds = [...new Set(ontologyClasses.flatMap((entry) => entry.taxonomy_node_ids || []))]
    const taxonomyNodes = workspace.taxonomyNodes.filter((entry) => taxonomyNodeIds.includes(entry.id))
    const terms = workspace.terms.filter((term) => semantic.ontology_class_ids.includes(term.class_id))
    const aliasesByTerm = workspace.aliases.reduce((acc, alias) => {
      if (!acc[alias.term_id]) acc[alias.term_id] = []
      acc[alias.term_id].push(alias.alias)
      return acc
    }, {})
    const rules = workspace.rules.filter((rule) => (rule.linked_entity_ids || []).includes(id))

    return {
      semantic,
      ontologyClasses,
      taxonomyNodes,
      terms: terms.map((term) => ({ ...term, aliases: aliasesByTerm[term.id] || [] })),
      rules,
    }
  }, [workspace, id])

  const lineageLinks = useMemo(() => {
    if (!workspace || !id) return []
    return workspace.artifacts.filter((artifact) => [...(artifact.input_refs || []), ...(artifact.output_refs || [])].some((ref) => ref.includes(id)))
  }, [workspace, id])

  const impactedObjects = useMemo(() => {
    if (!workspace || !id) return []
    return workspace.relationships
      .filter((relationship) => relationship.source_id === id)
      .map((relationship) => ({ id: relationship.target_id, type: relationship.category, reason: `${relationship.type} (${relationship.category})` }))
  }, [workspace, id])

  const pinned = asArrayParam(searchParams, 'pin')
  const compared = asArrayParam(searchParams, 'compare')
  const highlightedId = searchParams.get('highlight') || searchParams.get('anchor') || ''
  const evidenceAnchor = searchParams.get('anchor') || entity?.id || id

  const toggleEntityList = (key) => {
    if (!id) return
    const current = asArrayParam(searchParams, key)
    const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    setSearchParams(toSearch(searchParams, { [key]: next.join(',') }))
  }

  if (!workspace && !diagnostics.length) return <StatePanel state="loading" title="Loading entity detail" />

  if (!entity) {
    return (
      <div className="stack">
        <h1>Entity Detail</h1>
        <DataDiagnostics diagnostics={diagnostics} />
        <StatePanel state="error" title="Lookup error" action={{ label: 'Investigate', to: '/object-explorer' }} />
        <p className="meta">Canonical entity not available for {id}.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <h1>{entity.id}</h1>
      <p className="meta">Semantic Hub · {toTypeLabel(entity.entity_type)}</p>
      <DataDiagnostics diagnostics={diagnostics} />

      <Panel title="Executive summary">
        <p>
          <strong>Current posture:</strong> {entity.id} is a <strong>{toTypeLabel(entity.entity_type)}</strong> with{' '}
          <strong>{relationships.length}</strong> graph links, <strong>{relatedEvents.length}</strong> related events, and{' '}
          <strong>{lineageLinks.length}</strong> lineage artifacts in scope.
        </p>
        <p>
          <strong>Operational risk signal:</strong> {entity.risk || entity.status || entity.state || 'normal'}.
          Primary route for action is cross-workspace drilldown from this hub.
        </p>
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/graph', globalContext, { focusEntity: entity.id, highlight: entity.id, anchor: entity.id })}>Graph causality path</Link>
          <Link className="btn" to={toScopedPath('/process', globalContext, { highlight: entity.id, anchor: entity.id })}>Process swimlanes</Link>
          <Link className="btn" to={toScopedPath('/events', globalContext, { highlight: relatedEvents[0]?.id || entity.id, anchor: relatedEvents[0]?.id || entity.id })}>Temporal events</Link>
          <Link className="btn" to={toScopedPath(`/lineage/${lineageLinks[0]?.id || 'LIN_0039'}`, globalContext, { highlight: lineageLinks[0]?.id || '', anchor: lineageLinks[0]?.id || entity.id })}>Lineage DAG</Link>
        </div>
      </Panel>
      <EvidenceAnchorPanel anchor={evidenceAnchor} scopedPathFor={(path, patch) => toScopedPath(path, globalContext, { ...Object.fromEntries(searchParams.entries()), ...patch, anchor: evidenceAnchor })} />

      <Panel title="Entity actions">
        <div className="button-row">
          <button type="button" className="btn" onClick={() => toggleEntityList('pin')}>{pinned.includes(entity.id) ? 'Unpin entity' : 'Pin entity'}</button>
          <button type="button" className="btn" onClick={() => toggleEntityList('compare')}>{compared.includes(entity.id) ? 'Remove from compare' : 'Add to compare'}</button>
          <Link className="btn" to={toScopedPath('/graph', globalContext, { focusEntity: entity.id, mode: 'downstream-impact', anchor: entity.id })}>Impact view</Link>
          <Link className="btn" to={toScopedPath(`/lineage/${lineageLinks[0]?.id || 'LIN_0039'}`, globalContext, { anchor: lineageLinks[0]?.id || entity.id })}>Lineage view</Link>
          <Link className="btn" to={toScopedPath('/object-explorer', globalContext, Object.fromEntries(searchParams.entries()))}>Back to object search</Link>
        </div>
        <p className="meta">Pinned: {pinned.join(', ') || 'none'} | Compare: {compared.join(', ') || 'none'}</p>
      </Panel>

      {[...new Set([...pinned, ...compared])].filter((entityId) => entityId !== entity.id).length ? (
        <Panel title="Quick entity transitions">
          <div className="button-row">
            {[...new Set([...pinned, ...compared])].filter((entityId) => entityId !== entity.id).map((entityId) => (
              <Link key={entityId} className="btn" to={toScopedPath(`/object-explorer/${entityId}`, globalContext, Object.fromEntries(searchParams.entries()))}>{entityId}</Link>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title="Object narrative context">
        <p>
          <strong>Why this entity matters now:</strong>{' '}
          {relationships.length
            ? `${entity.id} is linked to ${relationships.length} active graph relationships, signaling active involvement in the current incident scope.`
            : `${entity.id} has limited graph connectivity but remains in canonical scope for this workspace.`}
        </p>
        <p>
          <strong>Primary lineage:</strong>{' '}
          {lineageLinks[0] ? <Link to={toScopedPath(`/lineage/${lineageLinks[0].id}`, globalContext)}>{lineageLinks[0].id}</Link> : 'none'}
        </p>
      </Panel>

      <Panel title="Business graph relationships">
        <ul className="list-reset">
          {relationships.map((relationship) => (
            <li key={relationship.id} className={highlightedId === relationship.id ? 'is-highlighted' : ''}>
              <strong>{relationship.id}</strong> — {relationship.source_id} {relationship.type} {relationship.target_id}
              <div className="meta">{relationship.category} | confidence {relationship.qualifiers?.confidence ?? 'n/a'} | polarity {relationship.qualifiers?.polarity ?? 'n/a'}</div>
              <div className="button-row">
                <Link to={toScopedPath('/graph', globalContext, { focusEntity: relationship.source_id, highlight: relationship.id, anchor: relationship.id })}>Highlight in graph</Link>
                <Link to={toScopedPath('/impact-analysis', globalContext, { focusEntity: relationship.target_id, highlight: relationship.id, anchor: relationship.id })}>Impact map</Link>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Impacted objects">
        <ul className="list-reset">
          {impactedObjects.map((obj) => (
            <li key={obj.id}><Link to={toScopedPath(`/object-explorer/${obj.id}`, globalContext, Object.fromEntries(searchParams.entries()))}>{obj.id}</Link> ({obj.type}) — {obj.reason}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="Technical depth (progressive disclosure)">
        <details>
          <summary>Meaning & ontology (canonical semantic store)</summary>
          <p><strong>Semantic tags:</strong> {(semantics?.semantic?.semantic_tags || []).join(', ') || 'none'}</p>

          <h3>Ontology classes</h3>
          <ul className="list-reset">
            {(semantics?.ontologyClasses || []).map((ontologyClass) => (
              <li key={ontologyClass.id}><strong>{ontologyClass.label}</strong> ({ontologyClass.id}) — {ontologyClass.definition}</li>
            ))}
          </ul>

          <h3>Definitions & aliases</h3>
          <ul className="list-reset">
            {(semantics?.terms || []).map((term) => (
              <li key={term.id}>
                <strong>{term.term}</strong> — {term.definition}
                <div className="meta">aliases: {(term.aliases || []).join(', ') || 'none'}</div>
              </li>
            ))}
          </ul>

          <h3>Taxonomy nodes</h3>
          <ul className="list-reset">
            {(semantics?.taxonomyNodes || []).map((node) => (
              <li key={node.id}><strong>{node.label}</strong> ({node.id})</li>
            ))}
          </ul>

          <h3>Linked rules</h3>
          <ul className="list-reset">
            {(semantics?.rules || []).map((rule) => (
              <li key={rule.id}><strong>{rule.label}</strong> ({rule.id}) — {rule.definition}</li>
            ))}
          </ul>
        </details>

        <details>
          <summary>State snapshot (canonical entity)</summary>
          <pre className="code-block">{JSON.stringify(entity, null, 2)}</pre>
        </details>

        <details>
          <summary>Source provenance</summary>
          <ul className="list-reset">
            {sourceRepresentations.map((source) => (
              <li key={source.source_representation_id}>
                <strong>{source.source_system}</strong> — {source.source_record_id} ({source.representation_type})
              </li>
            ))}
          </ul>
        </details>
      </Panel>

      <EventTimeline
        events={relatedEvents}
        highlightedId={highlightedId}
        onHighlight={(eventId) => setSearchParams(toSearch(searchParams, { highlight: eventId, anchor: eventId }))}
      />
    </div>
  )
}
