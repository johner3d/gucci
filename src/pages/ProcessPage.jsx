import { useEffect, useMemo, useState } from 'react'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { EventTimeline } from '../components/domain/EventTimeline'
import { Panel } from '../components/primitives/Primitives'
import { loadGraphData, toUiDiagnostics } from '../lib/api'

export function ProcessPage() {
  const [graph, setGraph] = useState(null)
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    loadGraphData()
      .then((payload) => {
        setGraph({ ...payload.graph, edges: payload.relationships })
        setDiagnostics(payload.diagnostics)
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'process.graph')))
  }, [])

  const processEdges = useMemo(() => {
    if (!graph) return []
    return graph.edges.filter((edge) => ['operational', 'processual', 'causal'].includes(edge.category))
  }, [graph])

  if (!graph && !diagnostics.length) return <p>Loading process…</p>

  return (
    <div className="stack">
      <h1>Process</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      {graph ? (
        <>
          <Panel title="Process relationship map">
            <ul className="row-list">
              {processEdges.map((edge) => (
                <li key={edge.id}>
                  {edge.source_id} — {edge.type} → {edge.target_id}
                  <div className="meta">
                    {edge.category} | confidence {edge.qualifiers?.confidence ?? 'n/a'} | strength {edge.qualifiers?.strength ?? 'n/a'}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          <EventTimeline events={processEdges.map((edge, index) => ({ id: edge.id, type: edge.type, occurred_at_utc: `step-${index + 1}` }))} />
        </>
      ) : (
        <p>Process content unavailable.</p>
      )}
    </div>
  )
}
