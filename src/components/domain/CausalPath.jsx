import { Link } from 'react-router-dom'
import { Button, Panel } from '../primitives/Primitives'

export function CausalPath({ details, focus, traversal, onTraversalChange, onFocusChange }) {
  return (
    <div className="stack">
      <Panel title="Causal path explorer">
        <p><strong>Focus:</strong> {details.node?.id} ({details.node?.type})</p>
        <div className="button-row">
          <Button primary onClick={() => onTraversalChange(focus, 'impact')} disabled={traversal === 'impact'}>
            Forward impact traversal
          </Button>
          <Button onClick={() => onTraversalChange('UI_OVERVIEW_CARD_ISSUE_01', 'lineage')} disabled={traversal === 'lineage'}>
            Backward lineage traversal
          </Button>
        </div>
      </Panel>

      <Panel title="Adjacent path">
        <ul className="row-list">
          {details.edges.map((edge) => (
            <li key={edge.id}>
              {edge.source_id} —[{edge.type}]→ {edge.target_id}{' '}
              <span className="meta">({edge.category}, confidence {edge.qualifiers?.confidence ?? 'n/a'})</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Next nodes">
        <ul className="row-list">
          {details.nodes.map((node) => (
            <li key={node.id}>
              <Button onClick={() => onFocusChange(node.id, traversal)}>{node.label}</Button>{' '}
              <span className="meta">({node.type})</span>
            </li>
          ))}
        </ul>
        <Link to={`/objects/${details.node?.id || focus}`}>Inspect focused object</Link>
      </Panel>
    </div>
  )
}
