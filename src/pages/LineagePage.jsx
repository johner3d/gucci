import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { LineageTrustPanel } from '../components/domain/LineageTrustPanel'
import { loadLineageArtifactsData, toUiDiagnostics } from '../lib/api'

export function LineagePage() {
  const { artifactId } = useParams()
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

  if (!artifact && !diagnostics.length) return <p>Loading lineage artifact…</p>

  return (
    <div className="stack">
      <h1>Lineage</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      {artifact ? <LineageTrustPanel artifact={artifact} /> : <p>Lineage artifact unavailable.</p>}
    </div>
  )
}
