import { Link } from 'react-router-dom'
import { Panel } from '../primitives/Primitives'

export function ObjectRelationships({ card, relationships = [] }) {
  return (
    <div className="stack">
      <Panel title="Object relationships">
        <p><strong>Object:</strong> {card.object_id}</p>
        <p><strong>Type:</strong> {card.canonical_identity.type}</p>
        <p>{card.issue_context.why_this_object_matters_now}</p>
        <p>
          <strong>Primary lineage:</strong>{' '}
          <Link to={`/lineage/${card.primary_lineage_artifact_id}`}>{card.primary_lineage_artifact_id}</Link>
        </p>
      </Panel>

      <Panel title="Business graph relationships">
        <ul className="list-reset">
          {relationships.map((relationship) => (
            <li key={relationship.id}>
              {relationship.type} → <Link to={`/objects/${relationship.target_id}`}>{relationship.target_id}</Link>
              <div className="meta">
                {relationship.category} | confidence {relationship.qualifiers?.confidence ?? 'n/a'} | polarity {relationship.qualifiers?.polarity ?? 'n/a'}
              </div>
              <div className="meta">
                validity: {relationship.qualifiers?.validity_interval?.start_utc || 'n/a'} → {relationship.qualifiers?.validity_interval?.end_utc || 'n/a'}
              </div>
              <div className="meta">evidence: {(relationship.qualifiers?.evidence_refs || []).join(', ') || 'none'}</div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Impacted objects">
        <ul className="list-reset">
          {(card.impacted_objects || []).map((obj) => (
            <li key={obj.id}>
              <Link to={`/objects/${obj.id}`}>{obj.id}</Link> ({obj.type}) — {obj.reason}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
