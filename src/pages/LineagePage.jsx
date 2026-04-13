import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { EvidenceAnchorPanel } from '../components/domain/EvidenceAnchorPanel'
import { LineageTrustPanel } from '../components/domain/LineageTrustPanel'
import { CtaButtonRow, Panel, StatePanel } from '../components/primitives/Primitives'
import { loadLineageArtifactsData, toUiDiagnostics } from '../lib/api'
import { captureLatencyHook } from '../lib/qaTelemetry'
import { toScopedPath } from '../lib/scopedLink'

export function LineagePage() {
  const { artifactId } = useParams()
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const [searchParams] = useSearchParams()
  const highlightedId = searchParams.get('highlight') || searchParams.get('anchor') || ''
  const evidenceAnchor = searchParams.get('anchor') || artifactId || globalContext.anchor || ''
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

  useEffect(() => {
    if (!artifactId) return
    captureLatencyHook('lineage.load', { artifactId, found: Boolean(artifact) })
  }, [artifact, artifactId])

  if (!artifact && !diagnostics.length) return <StatePanel state="loading" title="Loading lineage artifact" />

  return (
    <div className="stack">
      <h1>Lineage</h1>
      <p>Lineage explanations are split into business trust narrative and technical derivation details.</p>
      <DataDiagnostics diagnostics={diagnostics} />
      <Panel title="Lineage workspace interactions">
        <CtaButtonRow
          actions={[
            { key: 'investigate', label: 'Investigate', to: toScopedPath('/events', globalContext, { anchor: evidenceAnchor }) },
            { key: 'compare', label: 'Compare', to: toScopedPath('/impact-analysis', globalContext, { lineageArtifact: artifactId, anchor: evidenceAnchor }) },
            { key: 'lineage', label: 'Explain lineage', to: toScopedPath(`/lineage/${artifactId || 'LIN_0039'}`, globalContext, { anchor: evidenceAnchor }) },
            { key: 'export', label: 'Export', to: toScopedPath('/lineage', globalContext, { export: 'brief', anchor: evidenceAnchor }) },
          ]}
        />
      </Panel>
      <EvidenceAnchorPanel anchor={evidenceAnchor} scopedPathFor={(path, patch) => toScopedPath(path, globalContext, { ...Object.fromEntries(searchParams.entries()), ...patch, anchor: evidenceAnchor })} />
      {artifact ? (
        <Panel title="Lineage flow DAG">
          <p className="meta">Upstream artifacts feed the focused derivation, then fan out to downstream dependencies.</p>
          <div className="lineage-dag">
            {(artifact.upstream_artifact_ids || []).map((id) => (
              <Link key={id} className={`chip ${highlightedId === id ? 'is-highlighted' : ''}`.trim()} to={toScopedPath(`/lineage/${id}`, globalContext, { highlight: id, anchor: id })}>
                {id} ↑ upstream
              </Link>
            ))}
            <span className={`chip chip-primary ${highlightedId === artifact.id ? 'is-highlighted' : ''}`.trim()}>{artifact.id} focus</span>
            {(artifact.downstream_artifact_ids || []).map((id) => (
              <Link key={id} className={`chip ${highlightedId === id ? 'is-highlighted' : ''}`.trim()} to={toScopedPath(`/lineage/${id}`, globalContext, { highlight: id, anchor: id })}>
                {id} ↓ downstream
              </Link>
            ))}
          </div>
          <p className="meta">DAG nodes in local flow: {dagNodes.join(' → ')}</p>
        </Panel>
      ) : null}
      {artifact ? <LineageTrustPanel artifact={artifact} /> : <StatePanel state="empty" title="Lineage artifact unavailable" />}
    </div>
  )
}
