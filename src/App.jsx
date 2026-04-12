import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useParams, useSearchParams } from 'react-router-dom'

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
          <p>
            <strong>Lineage:</strong>{' '}
            <Link to={`/lineage/${card.lineage_artifact_id}`}>{card.lineage_artifact_id}</Link>
          </p>
          <Link to={`/graph?focus=${card.deep_link.focus_node_id}&path=${card.deep_link.path.join(',')}`}>
            Open graph impact & lineage
          </Link>
        </article>
      ))}
      <h2 style={{ marginTop: 24 }}>Object cards</h2>
      <ul>
        {['ASSET_PAINT_ROBOT_07', 'ORD_10045', 'SU_900001', 'KPIOBS_2101'].map((id) => (
          <li key={id}><Link to={`/objects/${id}`}>{id}</Link></li>
        ))}
      </ul>
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

function ObjectCardPage() {
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
      <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <p><Link to="/">← Back to overview</Link></p>
        <h1>Object Card</h1>
        <p>{error}</p>
      </main>
    )
  }

  if (!card) return <p>Loading object card…</p>

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p><Link to="/">← Back to overview</Link></p>
      <h1>{card.canonical_identity.label}</h1>
      <p><strong>Object ID:</strong> {card.object_id}</p>
      <p><strong>Type:</strong> {card.canonical_identity.type}</p>
      <p><strong>Issue context:</strong> {card.issue_context.why_this_object_matters_now}</p>
      <p>
        <strong>Primary lineage:</strong>{' '}
        <Link to={`/lineage/${card.primary_lineage_artifact_id}`}>{card.primary_lineage_artifact_id}</Link>
      </p>

      <h2>Source representations</h2>
      <ul>
        {(card.source_representations || []).map((rep) => (
          <li key={rep.source_representation_id}>
            {rep.source_representation_id} — {rep.source_system}:{rep.source_record_id} ({rep.representation_type})
          </li>
        ))}
      </ul>

      <h2>Semantic meaning</h2>
      <p>{card.semantic_meaning.summary}</p>

      <h2>Current state/status snapshot</h2>
      <p><strong>Status:</strong> {card.current_state_snapshot.status}</p>
      <p><strong>As of:</strong> {card.current_state_snapshot.as_of_utc}</p>
      <pre style={{ background: '#f7f7f7', padding: 12, borderRadius: 8 }}>
        {JSON.stringify(card.current_state_snapshot.attributes, null, 2)}
      </pre>

      <h2>Key relationships (business graph)</h2>
      <ul>
        {(card.key_relationships?.business_graph || []).map((relationship) => (
          <li key={`${relationship.relationship}-${relationship.target_id}`}>
            {relationship.relationship} → <Link to={`/objects/${relationship.target_id}`}>{relationship.target_id}</Link> ({relationship.target_type})
          </li>
        ))}
      </ul>

      <h2>Related events/results timeline</h2>
      <ul>
        {(card.related_timeline || []).map((item) => (
          <li key={item.id}>
            {item.occurred_at_utc || item.recorded_at_utc || item.window_end_utc} — {item.type || item.kpi || 'snapshot'} ({item.id})
          </li>
        ))}
      </ul>

      <h2>Relevant KPI signals</h2>
      <ul>
        {(card.relevant_kpi_signals || []).map((kpi) => (
          <li key={kpi.id}>
            <Link to={`/objects/${kpi.id}`}>{kpi.id}</Link> — {kpi.kpi}: {String(kpi.value)} ({kpi.status})
          </li>
        ))}
      </ul>

      <h2>Impacted objects</h2>
      <ul>
        {(card.impacted_objects || []).map((obj) => (
          <li key={obj.id}>
            <Link to={`/objects/${obj.id}`}>{obj.id}</Link> ({obj.type}) — {obj.reason}
          </li>
        ))}
      </ul>

      <h2>Lineage entries</h2>
      <ul>
        {(card.lineage_entry_links || []).map((link) => (
          <li key={link.artifact_id}>
            <Link to={link.route}>{link.artifact_id}</Link> — {link.name}
          </li>
        ))}
      </ul>
    </main>
  )
}

function LineagePage() {
  const { artifactId } = useParams()
  const [artifacts, setArtifacts] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    loadJSON('/data/generated/v1/lineage/artifacts.json')
      .then(setArtifacts)
      .catch(() => setError('Could not load lineage artifacts'))
  }, [])

  const artifact = artifacts.find((entry) => entry.id === artifactId)

  const renderRef = (ref) => {
    if (ref.startsWith('LIN_')) {
      return <Link to={`/lineage/${ref}`}>{ref}</Link>
    }
    if (
      ref.startsWith('KPIOBS_')
      || ref.startsWith('ORD_')
      || ref.startsWith('SU_')
      || ref.startsWith('ASSET_')
    ) {
      return <Link to={`/objects/${ref}`}>{ref}</Link>
    }
    return <span>{ref}</span>
  }

  if (error) {
    return (
      <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <p><Link to="/">← Back to overview</Link></p>
        <h1>Lineage artifact</h1>
        <p>{error}</p>
      </main>
    )
  }

  if (!artifact) return <p>Loading lineage artifact…</p>

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <p><Link to="/">← Back to overview</Link></p>
      <h1>Lineage artifact {artifact.id}</h1>
      <p><strong>Type:</strong> {artifact.artifact_type}</p>
      <p><strong>Rule name:</strong> {artifact.rule_name}</p>
      <p><strong>Version:</strong> {artifact.version}</p>
      <p><strong>Rationale:</strong> {artifact.rationale}</p>

      <h2>Inputs</h2>
      <ul>
        {(artifact.input_refs || []).map((ref) => (
          <li key={ref}>{renderRef(ref)}</li>
        ))}
      </ul>

      <h2>Outputs</h2>
      <ul>
        {(artifact.output_refs || []).map((ref) => (
          <li key={ref}>{renderRef(ref)}</li>
        ))}
      </ul>

      <h2>Upstream artifacts</h2>
      <ul>
        {(artifact.upstream_artifact_ids || []).map((id) => (
          <li key={id}><Link to={`/lineage/${id}`}>{id}</Link></li>
        ))}
        {!(artifact.upstream_artifact_ids || []).length && <li>None</li>}
      </ul>

      <h2>Downstream artifacts</h2>
      <ul>
        {(artifact.downstream_artifact_ids || []).map((id) => (
          <li key={id}><Link to={`/lineage/${id}`}>{id}</Link></li>
        ))}
        {!(artifact.downstream_artifact_ids || []).length && <li>None</li>}
      </ul>
    </main>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/graph" element={<GraphPage />} />
      <Route path="/objects/:id" element={<ObjectCardPage />} />
      <Route path="/lineage/:artifactId" element={<LineagePage />} />
    </Routes>
  )
}
