import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { EventTimeline } from '../components/domain/EventTimeline'
import { ObjectRelationships } from '../components/domain/ObjectRelationships'
import { Panel } from '../components/primitives/Primitives'
import { loadGraphData, loadObjectCardData, toUiDiagnostics } from '../lib/api'

export function ObjectsPage() {
  const { id } = useParams()
  const [card, setCard] = useState(null)
  const [relationships, setRelationships] = useState([])
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    if (!id) return
    setCard(null)
    setRelationships([])
    setDiagnostics([])
    Promise.all([loadObjectCardData(id), loadGraphData()])
      .then(([cardPayload, graphPayload]) => {
        setCard(cardPayload.card)
        setRelationships(
          graphPayload.relationships.filter(
            (relationship) => relationship.source_id === id || relationship.target_id === id
          )
        )
        setDiagnostics([...cardPayload.diagnostics, ...graphPayload.diagnostics])
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, `object_card.${id}`)))
  }, [id])

  if (!card && !diagnostics.length) return <p>Loading object card…</p>

  if (!card) {
    return (
      <div className="stack">
        <h1>Objects</h1>
        <DataDiagnostics diagnostics={diagnostics} />
        <Panel title="Lookup error">
          <p>Object card not available for {id}.</p>
          <Link to="/">Return to overview</Link>
        </Panel>
      </div>
    )
  }

  return (
    <div className="stack">
      <h1>{card.canonical_identity.label}</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      <ObjectRelationships card={card} relationships={relationships} />

      <Panel title="Meaning & Ontology">
        <p><strong>Semantic summary:</strong> {card.semantic_meaning?.summary || 'n/a'}</p>
        <p><strong>Semantic tags:</strong> {(card.meaning_ontology?.semantic_tags || []).join(', ') || 'none'}</p>

        <h3>Ontology classes</h3>
        <ul className="list-reset">
          {(card.meaning_ontology?.ontology_classes || []).map((ontologyClass) => (
            <li key={ontologyClass.id}>
              <strong>{ontologyClass.label}</strong> ({ontologyClass.id}) — {ontologyClass.definition}
            </li>
          ))}
        </ul>

        <h3>Definitions & aliases</h3>
        <ul className="list-reset">
          {(card.meaning_ontology?.terms || []).map((term) => (
            <li key={term.id}>
              <strong>{term.term}</strong> — {term.definition}
              <div className="meta">aliases: {(term.aliases || []).join(', ') || 'none'}</div>
              <div className="meta">
                links:{' '}
                {(term.cross_links || []).map((link, idx) => (
                  <span key={`${term.id}.${link.surface}`}>
                    {idx > 0 ? ' | ' : ''}
                    <Link to={link.route}>{link.surface}</Link>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <h3>Taxonomy nodes</h3>
        <ul className="list-reset">
          {(card.meaning_ontology?.taxonomy_nodes || []).map((node) => (
            <li key={node.id}>
              <strong>{node.label}</strong> ({node.id})
              <div className="meta">
                links:{' '}
                {(node.cross_links || []).map((link, idx) => (
                  <span key={`${node.id}.${link.surface}`}>
                    {idx > 0 ? ' | ' : ''}
                    <Link to={link.route}>{link.surface}</Link>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <h3>Linked rules</h3>
        <ul className="list-reset">
          {(card.meaning_ontology?.linked_rules || []).map((rule) => (
            <li key={rule.id}>
              <strong>{rule.label}</strong> ({rule.id}) — {rule.definition}
              <div className="meta">lineage rules: {(rule.lineage_rule_names || []).join(', ') || 'none'}</div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="State snapshot">
        <p><strong>Status:</strong> {card.current_state_snapshot.status}</p>
        <p><strong>As of:</strong> {card.current_state_snapshot.as_of_utc}</p>
        <pre className="code-block">{JSON.stringify(card.current_state_snapshot.attributes, null, 2)}</pre>
      </Panel>

      <EventTimeline events={card.related_timeline || []} />
    </div>
  )
}
