import { Link } from 'react-router-dom'
import { Panel } from '../primitives/Primitives'

export function ObjectRelationships({ card }) {
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
          {(card.key_relationships?.business_graph || []).map((relationship) => (
            <li key={`${relationship.relationship}-${relationship.target_id}`}>
              {relationship.relationship} → <Link to={`/objects/${relationship.target_id}`}>{relationship.target_id}</Link>
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
