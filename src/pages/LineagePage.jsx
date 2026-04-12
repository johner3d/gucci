import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { LineageTrustPanel } from '../components/domain/LineageTrustPanel'
import { Panel } from '../components/primitives/Primitives'
import { loadLineageArtifactsData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'

export function LineagePage() {
  const { artifactId } = useParams()
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const [searchParams] = useSearchParams()
  const highlightedId = searchParams.get('highlight') || ''
  const [artifacts, setArtifacts] = useState([])
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    loadLineageArtifactsData()
      .then((payload) => {
        setArtifacts(payload.artifacts)
        setDiagnostics(payload.diagnostics)
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'lineage.artifacts')))
  }, [])

  const artifact = useMemo(() => artifacts.find((entry) => entry.id === artifactId), [artifactId, artifacts])
  const dagNodes = useMemo(() => {
    if (!artifact) return []
    return [...new Set([...(artifact.upstream_artifact_ids || []), artifact.id, ...(artifact.downstream_artifact_ids || [])])]
  }, [artifact])

  if (!artifact && !diagnostics.length) return <p>Loading lineage artifact…</p>

  return (
    <div className="stack">
      <h1>Lineage</h1>
      <p>Lineage explanations are split into business trust narrative and technical derivation details.</p>
      <DataDiagnostics diagnostics={diagnostics} />
      <Panel title="Lineage workspace interactions">
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/impact-analysis', globalContext, { lineageArtifact: artifactId })}>Impact analysis replay</Link>
          <Link className="btn" to={toScopedPath('/graph', globalContext, { mode: 'lineage-trail' })}>Graph lineage trail</Link>
          <Link className="btn" to={toScopedPath('/object-explorer', globalContext, { lineageArtifact: artifactId })}>Object explorer</Link>
        </div>
      </Panel>
      {artifact ? (
        <Panel title="Lineage flow DAG">
          <p className="meta">Upstream artifacts feed the focused derivation, then fan out to downstream dependencies.</p>
          <div className="lineage-dag">
            {(artifact.upstream_artifact_ids || []).map((id) => (
              <Link key={id} className={`chip ${highlightedId === id ? 'is-highlighted' : ''}`.trim()} to={toScopedPath(`/lineage/${id}`, globalContext, { highlight: id })}>
                {id} ↑ upstream
              </Link>
            ))}
            <span className={`chip chip-primary ${highlightedId === artifact.id ? 'is-highlighted' : ''}`.trim()}>{artifact.id} focus</span>
            {(artifact.downstream_artifact_ids || []).map((id) => (
              <Link key={id} className={`chip ${highlightedId === id ? 'is-highlighted' : ''}`.trim()} to={toScopedPath(`/lineage/${id}`, globalContext, { highlight: id })}>
                {id} ↓ downstream
              </Link>
            ))}
          </div>
          <p className="meta">DAG nodes in local flow: {dagNodes.join(' → ')}</p>
        </Panel>
      ) : null}
      {artifact ? <LineageTrustPanel artifact={artifact} /> : <p>Lineage artifact unavailable.</p>}
    </div>
  )
}
