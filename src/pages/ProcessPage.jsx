import { useEffect, useMemo, useState } from 'react'
import { EventTimeline } from '../components/domain/EventTimeline'
import { Panel } from '../components/primitives/Primitives'
import { loadJSON } from '../lib/api'

export function ProcessPage() {
  const [graph, setGraph] = useState(null)

  useEffect(() => {
    loadJSON('/data/generated/v1/ui/graph.json').then(setGraph)
  }, [])

  const processEdges = useMemo(() => {
    if (!graph) return []
    return graph.edges.filter((edge) => edge.relationship_class === 'business')
  }, [graph])

  if (!graph) return <p>Loading process…</p>

  return (
    <div className="stack">
      <h1>Process</h1>
      <Panel title="Process relationship map">
        <ul className="row-list">
          {processEdges.map((edge) => (
            <li key={edge.id}>{edge.source} — {edge.relationship} → {edge.target}</li>
          ))}
        </ul>
      </Panel>
      <EventTimeline events={processEdges.map((edge, index) => ({ id: edge.id, type: edge.relationship, occurred_at_utc: `step-${index + 1}` }))} />
    </div>
  )
}
