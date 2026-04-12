import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { CausalPath } from '../components/domain/CausalPath'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { Panel } from '../components/primitives/Primitives'
import { loadGraphData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'

const queryModeOptions = [
  { value: 'downstream-impact', label: 'Downstream impact' },
  { value: 'upstream-cause', label: 'Upstream cause' },
  { value: 'dependency-chain', label: 'Dependency chain' },
  { value: 'lineage-trail', label: 'Lineage trail' },
]

const defaultGraphQuery = {
  mode: 'downstream-impact',
  hopDepth: 2,
  relationshipClass: 'all',
  evidenceMin: 0.75,
}

function normalizeMode(rawMode) {
  const match = queryModeOptions.find((option) => option.value === rawMode)
  return match?.value || defaultGraphQuery.mode
}

function relationshipClassForEdge(edge) {
  if (edge.relationship_class) return edge.relationship_class
  return ['lineage', 'semantic'].includes(edge.category) ? 'technical_lineage' : 'business'
}

function scoreEdgeBusinessImpact(edge) {
  const categoryWeights = {
    causal: 1,
    analytical: 0.85,
    operational: 0.72,
    processual: 0.68,
    structural: 0.66,
    semantic: 0.42,
    lineage: 0.36,
  }
  const typeWeights = {
    impacts: 1,
    influences: 0.95,
    correlates_with: 0.8,
    observed_on: 0.66,
    detected_on: 0.6,
    derived_from: 0.45,
    mapped_from: 0.4,
  }

  const categoryWeight = categoryWeights[edge.category] ?? 0.5
  const typeWeight = typeWeights[edge.type] ?? 0.55
  const polarityWeight = edge.qualifiers?.polarity === 'negative' ? 1 : 0.82

  return Number((categoryWeight * typeWeight * polarityWeight).toFixed(3))
}

function toPathDetails(pathEdges) {
  const confidenceScores = pathEdges.map((edge) => Number(edge.qualifiers?.confidence ?? 0.5))
  const businessImpactScores = pathEdges.map((edge) => scoreEdgeBusinessImpact(edge))
  const minConfidence = confidenceScores.length ? Math.min(...confidenceScores) : 0
  const avgBusinessImpact = businessImpactScores.length
    ? businessImpactScores.reduce((sum, entry) => sum + entry, 0) / businessImpactScores.length
    : 0

  return {
    edges: pathEdges,
    hops: pathEdges.length,
    confidence: Number(minConfidence.toFixed(3)),
    businessImpact: Number(avgBusinessImpact.toFixed(3)),
    score: Number((minConfidence * 0.65 + avgBusinessImpact * 0.35).toFixed(3)),
  }
}

function shouldTraverseEdge(mode, edge, focusId) {
  if (mode === 'downstream-impact') return edge.source_id === focusId
  if (mode === 'upstream-cause') return edge.target_id === focusId
  if (mode === 'dependency-chain') return edge.source_id === focusId || edge.target_id === focusId
  return edge.category === 'lineage' && (edge.source_id === focusId || edge.target_id === focusId)
}

function nextNodeForEdge(mode, edge, currentId) {
  if (mode === 'upstream-cause') return edge.source_id
  if (mode === 'downstream-impact') return edge.target_id
  return edge.source_id === currentId ? edge.target_id : edge.source_id
}

function findPaths({ graph, focus, query }) {
  const focusNode = graph.nodes.find((node) => node.id === focus) || graph.nodes.find((node) => node.id === graph.default_focus_node_id)
  if (!focusNode) return { node: null, paths: [], adjacentEdges: [], reachableNodeIds: [] }

  const allowedClass = query.relationshipClass
  const isClassAllowed = (edge) => {
    const edgeClass = relationshipClassForEdge(edge)
    return allowedClass === 'all' ? true : edgeClass === allowedClass
  }

  const isModeAllowed = (edge, nodeId) => {
    if (query.mode === 'dependency-chain') return edge.category !== 'lineage'
    if (query.mode === 'lineage-trail') return edge.category === 'lineage'
    return shouldTraverseEdge(query.mode, edge, nodeId)
  }

  const isEvidenceStrong = (edge) => Number(edge.qualifiers?.strength ?? 0) >= query.evidenceMin
  const paths = []
  const queue = [{ nodeId: focusNode.id, traversed: [], visitedNodeIds: new Set([focusNode.id]) }]

  while (queue.length) {
    const current = queue.shift()
    if (current.traversed.length >= query.hopDepth) continue

    const candidateEdges = graph.edges.filter(
      (edge) =>
        isClassAllowed(edge) &&
        isEvidenceStrong(edge) &&
        isModeAllowed(edge, current.nodeId) &&
        (query.mode === 'dependency-chain' || query.mode === 'lineage-trail'
          ? edge.source_id === current.nodeId || edge.target_id === current.nodeId
          : true)
    )

    candidateEdges.forEach((edge) => {
      const nextNode = nextNodeForEdge(query.mode, edge, current.nodeId)
      if (!nextNode || current.visitedNodeIds.has(nextNode)) return

      const nextTraversed = [...current.traversed, edge]
      paths.push(toPathDetails(nextTraversed))
      queue.push({
        nodeId: nextNode,
        traversed: nextTraversed,
        visitedNodeIds: new Set([...current.visitedNodeIds, nextNode]),
      })
    })
  }

  const rankedPaths = paths
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      return right.businessImpact - left.businessImpact
    })
    .slice(0, 20)

  const adjacentEdges = rankedPaths[0]?.edges || []
  const reachableNodeIds = [...new Set(rankedPaths.flatMap((path) => path.edges.flatMap((edge) => [edge.source_id, edge.target_id])))]

  return { node: focusNode, paths: rankedPaths, adjacentEdges, reachableNodeIds }
}

export function GraphPage() {
  const [graph, setGraph] = useState(null)
  const [diagnostics, setDiagnostics] = useState([])
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const [searchParams, setSearchParams] = useSearchParams()

  const focus = searchParams.get('focus') || globalContext.focus || 'KPIOBS_2101'
  const selectedNode = searchParams.get('selectedNode') || globalContext.selectedNode || focus
  const selectedPathId = searchParams.get('selectedPath') || globalContext.selectedPath || ''
  const highlightedId = searchParams.get('highlight') || ''

  const query = {
    mode: normalizeMode(searchParams.get('mode')),
    hopDepth: Math.max(1, Math.min(4, Number(searchParams.get('hops') || defaultGraphQuery.hopDepth))),
    relationshipClass: searchParams.get('relationshipClass') || defaultGraphQuery.relationshipClass,
    evidenceMin: Math.max(0, Math.min(1, Number(searchParams.get('evidenceMin') || defaultGraphQuery.evidenceMin))),
  }

  useEffect(() => {
    loadGraphData()
      .then((payload) => {
        setGraph({ ...payload.graph, edges: payload.relationships })
        setDiagnostics(payload.diagnostics)
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'graph')))
  }, [])

  const details = useMemo(() => {
    if (!graph) return { node: null, paths: [], adjacentEdges: [], reachableNodeIds: [] }
    return findPaths({ graph, focus, query })
  }, [focus, graph, query.evidenceMin, query.hopDepth, query.mode, query.relationshipClass])

  const updateSearch = (patch) => {
    const current = Object.fromEntries(searchParams.entries())
    setSearchParams({ ...current, ...globalContext, ...patch })
  }

  if (!graph && !diagnostics.length) return <p>Loading graph…</p>

  return (
    <div className="stack">
      <h1>Graph</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      <Panel title="Graph workspace interactions">
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/impact-analysis', globalContext, { focus })}>Impact analysis</Link>
          <Link className="btn" to={toScopedPath('/events', globalContext, { focus })}>Events evidence</Link>
          <Link className="btn" to={toScopedPath('/process', globalContext, { focus })}>Process context</Link>
          <Link className="btn" to={toScopedPath('/lineage', globalContext, { focus, highlight: highlightedId })}>Lineage flow</Link>
        </div>
      </Panel>
      <Panel title="Impact propagation mapping">
        <p className="meta">
          Reachable propagation surface: <strong>{details.reachableNodeIds.length}</strong> nodes from focus <strong>{focus}</strong>.
        </p>
        <div className="button-row">
          {details.reachableNodeIds.slice(0, 8).map((nodeId) => (
            <Link key={nodeId} className="btn" to={toScopedPath('/impact-analysis', globalContext, { focus: nodeId, highlight: highlightedId })}>
              Propagate to {nodeId}
            </Link>
          ))}
        </div>
      </Panel>
      {graph ? (
        <CausalPath
          details={details}
          focus={focus}
          selectedNode={selectedNode}
          selectedPathId={selectedPathId}
          highlightedId={highlightedId}
          query={query}
          queryModeOptions={queryModeOptions}
          onQueryChange={(patch) => updateSearch(patch)}
          onFocusChange={(nextFocus) => updateSearch({ focus: nextFocus, selectedNode: nextFocus })}
          onSelectNode={(nextNode) => updateSearch({ selectedNode: nextNode })}
          onSelectPath={(pathId, nodeId) => updateSearch({ selectedPath: pathId, selectedNode: nodeId })}
          onHighlight={(edgeId) => updateSearch({ highlight: edgeId })}
          scopedPathFor={(path, patch) => toScopedPath(path, globalContext, { ...Object.fromEntries(searchParams.entries()), ...patch })}
          objectPathForNode={(nodeId) => toScopedPath(`/object-explorer/${nodeId}`, globalContext)}
        />
      ) : (
        <p>Graph content unavailable.</p>
      )}
    </div>
  )
}
