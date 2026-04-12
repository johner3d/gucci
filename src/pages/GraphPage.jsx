import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CausalPath } from '../components/domain/CausalPath'
import { loadJSON } from '../lib/api'

export function GraphPage() {
  const [graph, setGraph] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const focus = searchParams.get('focus') || 'KPIOBS_2101'
  const traversal = searchParams.get('mode') || 'impact'

  useEffect(() => {
    loadJSON('/data/generated/v1/ui/graph.json').then(setGraph)
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

  if (!graph) return <p>Loading graph…</p>

  return (
    <div className="stack">
      <h1>Graph</h1>
      <CausalPath
        details={details}
        focus={focus}
        traversal={traversal}
        onTraversalChange={(nextFocus, mode) => setSearchParams({ focus: nextFocus, mode })}
        onFocusChange={(nextFocus, mode) => setSearchParams({ focus: nextFocus, mode })}
      />
    </div>
  )
}
