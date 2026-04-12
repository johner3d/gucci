import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { EventTimeline } from '../components/domain/EventTimeline'
import { Panel } from '../components/primitives/Primitives'
import { loadEntityWorkspaceData, toUiDiagnostics } from '../lib/api'

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

  useEffect(() => {
    loadEntityWorkspaceData()
      .then((payload) => {
        setWorkspace(payload)
        setDiagnostics(payload.diagnostics)
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, `objects.${id}`)))
  }, [id])

  const entity = useMemo(() => workspace?.entities?.find((candidate) => candidate.id === id) || null, [workspace, id])

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

  const toggleEntityList = (key) => {
    if (!id) return
    const current = asArrayParam(searchParams, key)
    const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    setSearchParams(toSearch(searchParams, { [key]: next.join(',') }))
  }

  if (!workspace && !diagnostics.length) return <p>Loading entity detail…</p>

  if (!entity) {
    return (
      <div className="stack">
        <h1>Entity Detail</h1>
        <DataDiagnostics diagnostics={diagnostics} />
        <Panel title="Lookup error">
          <p>Canonical entity not available for {id}.</p>
          <Link to="/object-explorer">Return to object search workspace</Link>
        </Panel>
      </div>
    )
  }

  return (
    <div className="stack">
      <h1>{entity.id}</h1>
      <p className="meta">Entity Detail · {toTypeLabel(entity.entity_type)}</p>
      <DataDiagnostics diagnostics={diagnostics} />

      <Panel title="Entity actions">
        <div className="button-row">
          <button type="button" className="btn" onClick={() => toggleEntityList('pin')}>{pinned.includes(entity.id) ? 'Unpin entity' : 'Pin entity'}</button>
          <button type="button" className="btn" onClick={() => toggleEntityList('compare')}>{compared.includes(entity.id) ? 'Remove from compare' : 'Add to compare'}</button>
          <Link className="btn" to={`/graph?focus=${entity.id}&mode=downstream-impact`}>Impact view</Link>
          <Link className="btn" to={`/lineage/${lineageLinks[0]?.id || 'LIN_0039'}`}>Lineage view</Link>
          <Link className="btn" to={`/object-explorer?${searchParams.toString()}`}>Back to object search</Link>
        </div>
        <p className="meta">Pinned: {pinned.join(', ') || 'none'} | Compare: {compared.join(', ') || 'none'}</p>
      </Panel>

      {[...new Set([...pinned, ...compared])].filter((entityId) => entityId !== entity.id).length ? (
        <Panel title="Quick entity transitions">
          <div className="button-row">
            {[...new Set([...pinned, ...compared])].filter((entityId) => entityId !== entity.id).map((entityId) => (
              <Link key={entityId} className="btn" to={`/object-explorer/${entityId}?${searchParams.toString()}`}>{entityId}</Link>
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
          {lineageLinks[0] ? <Link to={`/lineage/${lineageLinks[0].id}`}>{lineageLinks[0].id}</Link> : 'none'}
        </p>
      </Panel>

      <Panel title="Business graph relationships">
        <ul className="list-reset">
          {relationships.map((relationship) => (
            <li key={relationship.id}>
              <strong>{relationship.id}</strong> — {relationship.source_id} {relationship.type} {relationship.target_id}
              <div className="meta">{relationship.category} | confidence {relationship.qualifiers?.confidence ?? 'n/a'} | polarity {relationship.qualifiers?.polarity ?? 'n/a'}</div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Impacted objects">
        <ul className="list-reset">
          {impactedObjects.map((obj) => (
            <li key={obj.id}><Link to={`/object-explorer/${obj.id}?${searchParams.toString()}`}>{obj.id}</Link> ({obj.type}) — {obj.reason}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="Meaning & ontology (canonical semantic store)">
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
      </Panel>

      <Panel title="State snapshot (canonical entity)">
        <pre className="code-block">{JSON.stringify(entity, null, 2)}</pre>
      </Panel>

      <Panel title="Source provenance">
        <ul className="list-reset">
          {sourceRepresentations.map((source) => (
            <li key={source.source_representation_id}>
              <strong>{source.source_system}</strong> — {source.source_record_id} ({source.representation_type})
            </li>
          ))}
        </ul>
      </Panel>

      <EventTimeline events={relatedEvents} />
    </div>
  )
}
