import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LineageTrustPanel } from '../components/domain/LineageTrustPanel'
import { loadJSON } from '../lib/api'

export function LineagePage() {
  const { artifactId } = useParams()
  const [artifacts, setArtifacts] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    loadJSON('/data/generated/v1/lineage/artifacts.json')
      .then(setArtifacts)
      .catch(() => setError('Could not load lineage artifacts'))
  }, [])

  const artifact = useMemo(() => artifacts.find((entry) => entry.id === artifactId), [artifactId, artifacts])

  if (error) return <p>{error}</p>
  if (!artifact) return <p>Loading lineage artifact…</p>

  return (
    <div className="stack">
      <h1>Lineage</h1>
      <LineageTrustPanel artifact={artifact} />
    </div>
  )
}
