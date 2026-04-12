import { Link } from 'react-router-dom'
import { Card } from '../primitives/Primitives'

export function ImpactSummary({ cards = [] }) {
  return (
    <section className="stack">
      <h2>Impact summary</h2>
      <div className="page-grid">
        {cards.map((card) => (
          <Card key={card.card_id}>
            <h3>{card.label}</h3>
            <p><strong>Value:</strong> {card.value}</p>
            <p><strong>Status:</strong> {card.status}</p>
            <p>
              <strong>Lineage:</strong>{' '}
              <Link to={`/lineage/${card.lineage_artifact_id}`}>{card.lineage_artifact_id}</Link>
            </p>
            <div className="button-row">
              <Link to={`/graph?focus=${card.deep_link.focus_node_id}&mode=downstream-impact`}>Open impact path</Link>
              <Link to={`/object-explorer/${card.deep_link.focus_node_id}?entry=overview_card`}>Entity detail</Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
