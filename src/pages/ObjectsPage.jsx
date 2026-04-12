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

      <Panel title="State snapshot">
        <p><strong>Status:</strong> {card.current_state_snapshot.status}</p>
        <p><strong>As of:</strong> {card.current_state_snapshot.as_of_utc}</p>
        <pre className="code-block">{JSON.stringify(card.current_state_snapshot.attributes, null, 2)}</pre>
      </Panel>

      <EventTimeline events={card.related_timeline || []} />
    </div>
  )
}
