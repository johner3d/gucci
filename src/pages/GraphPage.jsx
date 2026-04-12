import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CausalPath } from '../components/domain/CausalPath'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { loadGraphData, toUiDiagnostics } from '../lib/api'

export function GraphPage() {
  const [graph, setGraph] = useState(null)
  const [diagnostics, setDiagnostics] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const focus = searchParams.get('focus') || 'KPIOBS_2101'
  const traversal = searchParams.get('mode') || 'impact'

  useEffect(() => {
    loadGraphData()
      .then((payload) => {
        setGraph(payload.graph)
        setDiagnostics(payload.diagnostics)
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'graph')))
  }, [])

  const details = useMemo(() => {
    if (!graph) return { node: null, edges: [], nodes: [] }
    const node = graph.nodes.find((n) => n.id === focus) || graph.nodes.find((n) => n.id === graph.default_focus_node_id)
    if (!node) return { node: null, edges: [], nodes: [] }

    const edges = graph.edges.filter((edge) => {
      if (edge.source !== node.id) return false
      return traversal === 'impact' ? edge.relationship_class === 'business' : edge.relationship_class === 'technical_lineage'
    })

    const nodes = edges.map((edge) => graph.nodes.find((candidate) => candidate.id === edge.target)).filter(Boolean)
    return { node, edges, nodes }
  }, [focus, graph, traversal])

  if (!graph && !diagnostics.length) return <p>Loading graph…</p>

  return (
    <div className="stack">
      <h1>Graph</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      {graph ? (
        <CausalPath
          details={details}
          focus={focus}
          traversal={traversal}
          onTraversalChange={(nextFocus, mode) => setSearchParams({ focus: nextFocus, mode })}
          onFocusChange={(nextFocus, mode) => setSearchParams({ focus: nextFocus, mode })}
        />
      ) : (
        <p>Graph content unavailable.</p>
      )}
    </div>
  )
}
