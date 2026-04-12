import { Link } from 'react-router-dom'
import { Button, Panel } from '../primitives/Primitives'

function toPathId(path) {
  return path.edges.map((edge) => edge.id).join('>')
}

function pathTerminalNode(path, focus) {
  if (!path.edges.length) return focus
  return path.edges[path.edges.length - 1].target_id
}

export function CausalPath({
  details,
  focus,
  selectedNode,
  selectedPathId,
  query,
  queryModeOptions,
  onQueryChange,
  onFocusChange,
  onSelectNode,
  onSelectPath,
  objectPathForNode,
}) {
  const classOptions = [
    { value: 'all', label: 'All classes' },
    { value: 'business', label: 'Business relationships' },
    { value: 'technical_lineage', label: 'Technical lineage' },
  ]

  const selectedPath = details.paths.find((path) => toPathId(path) === selectedPathId) || details.paths[0] || null
  const evidenceEdges = selectedPath?.edges || details.adjacentEdges || []

  return (
    <div className="graph-split-pane">
      <section className="graph-pane-main stack">
        <Panel title="Path query controls">
          <p>
            <strong>Focused node:</strong> {details.node?.id} ({details.node?.type})
          </p>

          <div className="query-grid">
            <label>
              Query mode
              <select value={query.mode} onChange={(event) => onQueryChange({ mode: event.target.value, selectedPath: '' })}>
                {queryModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Hop depth
              <input
                type="range"
                min="1"
                max="4"
                value={query.hopDepth}
                onChange={(event) => onQueryChange({ hops: String(event.target.value), selectedPath: '' })}
              />
              <span className="meta">{query.hopDepth} hops</span>
            </label>

            <label>
              Relationship class
              <select
                value={query.relationshipClass}
                onChange={(event) => onQueryChange({ relationshipClass: event.target.value, selectedPath: '' })}
              >
                {classOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Evidence strength threshold
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={query.evidenceMin}
                onChange={(event) => onQueryChange({ evidenceMin: String(event.target.value), selectedPath: '' })}
              />
            </label>
          </div>

          <p className="meta">Paths are ranked by confidence (65%) + business impact (35%).</p>
        </Panel>

        <Panel title="Ranked causal paths">
          {!details.paths.length ? <p className="meta">No paths matched the active query filters.</p> : null}
          <ul className="row-list">
            {details.paths.map((path) => {
              const pathId = toPathId(path)
              const isSelected = selectedPath ? toPathId(selectedPath) === pathId : false
              const terminalNode = pathTerminalNode(path, focus)

              return (
                <li key={pathId} className={isSelected ? 'path-row is-selected' : 'path-row'}>
                  <button type="button" className="btn" onClick={() => onSelectPath(pathId, terminalNode)}>
                    {path.edges.map((edge) => edge.id).join(' → ')}
                  </button>
                  <div className="meta">
                    hops {path.hops} | confidence {path.confidence} | business impact {path.businessImpact} | rank {path.score}
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Reachable nodes">
          <div className="button-row">
            {details.reachableNodeIds.map((nodeId) => (
              <Button key={nodeId} primary={nodeId === selectedNode} onClick={() => onSelectNode(nodeId)}>
                {nodeId}
              </Button>
            ))}
          </div>
          <div className="button-row">
            <Button primary onClick={() => onFocusChange(selectedNode || focus)}>
              Set selected node as focus
            </Button>
          </div>
          <Link to={objectPathForNode ? objectPathForNode(selectedNode || details.node?.id || focus) : `/object-explorer/${selectedNode || details.node?.id || focus}`}>
            Inspect selected object
          </Link>
        </Panel>
      </section>

      <section className="graph-pane-evidence stack">
        <Panel title="Evidence trace">
          {!evidenceEdges.length ? <p className="meta">Select a path to inspect supporting edges.</p> : null}
          <ul className="row-list">
            {evidenceEdges.map((edge) => (
              <li key={edge.id}>
                <strong>{edge.id}</strong> — {edge.source_id} → {edge.target_id}
                <div className="meta">{edge.type} | {edge.category}</div>
                <div className="meta">
                  confidence {edge.qualifiers?.confidence ?? 'n/a'} | strength {edge.qualifiers?.strength ?? 'n/a'} | polarity{' '}
                  {edge.qualifiers?.polarity ?? 'n/a'}
                </div>
                <div className="meta">evidence refs: {(edge.qualifiers?.evidence_refs || []).join(', ') || 'none'}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </div>
  )
}
