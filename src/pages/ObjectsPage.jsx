import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EventTimeline } from '../components/domain/EventTimeline'
import { ObjectRelationships } from '../components/domain/ObjectRelationships'
import { Panel } from '../components/primitives/Primitives'
import { loadJSON } from '../lib/api'

export function ObjectsPage() {
  const { id } = useParams()
  const [card, setCard] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setError('')
    setCard(null)
    loadJSON(`/data/generated/v1/ui/object_cards/${id}.json`)
      .then(setCard)
      .catch(() => setError(`Object card not found for ${id}`))
  }, [id])

  if (error) {
    return (
      <div className="stack">
        <h1>Objects</h1>
        <Panel title="Lookup error">
          <p>{error}</p>
          <Link to="/">Return to overview</Link>
        </Panel>
      </div>
    )
  }

  if (!card) return <p>Loading object card…</p>

  return (
    <div className="stack">
      <h1>{card.canonical_identity.label}</h1>
      <ObjectRelationships card={card} />

      <Panel title="State snapshot">
        <p><strong>Status:</strong> {card.current_state_snapshot.status}</p>
        <p><strong>As of:</strong> {card.current_state_snapshot.as_of_utc}</p>
        <pre className="code-block">{JSON.stringify(card.current_state_snapshot.attributes, null, 2)}</pre>
      </Panel>

      <EventTimeline events={card.related_timeline || []} />
    </div>
  )
}
