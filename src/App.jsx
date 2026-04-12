import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useSearchParams } from 'react-router-dom'

const jsonHeaders = { Accept: 'application/json' }

async function loadJSON(path) {
  const response = await fetch(path, { headers: jsonHeaders })
  if (!response.ok) throw new Error(`Could not load ${path}`)
  return response.json()
}

function OverviewPage() {
  const [pages, setPages] = useState([])

  useEffect(() => {
    loadJSON('/data/generated/v1/ui/pages.json').then(setPages)
  }, [])

  const page = pages[0]
  if (!page) return <p>Loading overview…</p>

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>{page.title}</h1>
      {page.cards.map((card) => (
        <article key={card.card_id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, maxWidth: 380 }}>
          <h2 style={{ marginTop: 0 }}>{card.label}</h2>
          <p><strong>Value:</strong> {card.value}</p>
          <p><strong>Status:</strong> {card.status}</p>
          <Link to={`/graph?focus=${card.deep_link.focus_node_id}&path=${card.deep_link.path.join(',')}`}>
            Open graph impact & lineage
          </Link>
        </article>
      ))}
    </main>
  )
}

function GraphPage() {
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

    const selectedEdges = graph.edges.filter((edge) => {
      if (edge.source !== node.id) return false
      if (traversal === 'impact') return edge.relationship_class === 'business'
      return edge.relationship_class === 'technical_lineage'
    })

    const nextNodes = selectedEdges
      .map((edge) => graph.nodes.find((candidate) => candidate.id === edge.target))
      .filter(Boolean)

    return { node, edges: selectedEdges, nodes: nextNodes }
  }, [focus, graph, traversal])

  if (!graph) return <p>Loading graph…</p>

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p><Link to="/">← Back to overview</Link></p>
      <h1>Issue Graph</h1>
      <p><strong>Focus:</strong> {details.node?.id} ({details.node?.type})</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setSearchParams({ focus, mode: 'impact' })} disabled={traversal === 'impact'}>Forward impact traversal</button>
        <button onClick={() => setSearchParams({ focus: 'UI_OVERVIEW_CARD_ISSUE_01', mode: 'lineage' })} disabled={traversal === 'lineage'}>Backward lineage traversal</button>
      </div>
      <h2>Adjacent path</h2>
      <ul>
        {details.edges.map((edge) => (
          <li key={edge.id}>
            {edge.source} —[{edge.relationship}]→ {edge.target}
          </li>
        ))}
      </ul>
      <h2>Next nodes</h2>
      <ul>
        {details.nodes.map((node) => (
          <li key={node.id}>
            <button onClick={() => setSearchParams({ focus: node.id, mode: traversal })}>{node.label}</button> <small>({node.type})</small>
          </li>
        ))}
      </ul>
    </main>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/graph" element={<GraphPage />} />
    </Routes>
  )
}
