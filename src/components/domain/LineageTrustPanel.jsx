import { Link } from 'react-router-dom'
import { Panel } from '../primitives/Primitives'

function RefLink({ ref }) {
  if (ref.startsWith('LIN_')) return <Link to={`/lineage/${ref}`}>{ref}</Link>
  if (/^(KPIOBS_|ORD_|SU_|ASSET_)/.test(ref)) return <Link to={`/objects/${ref}`}>{ref}</Link>
  return <span>{ref}</span>
}

export function LineageTrustPanel({ artifact }) {
  return (
    <div className="stack">
      <Panel title={`Lineage trust panel: ${artifact.id}`}>
        <p><strong>Type:</strong> {artifact.artifact_type}</p>
        <p><strong>Rule:</strong> {artifact.rule_name}</p>
        <p><strong>Version:</strong> {artifact.version}</p>
        <p><strong>Rationale:</strong> {artifact.rationale}</p>
      </Panel>

      <Panel title="Input references">
        <ul className="list-reset">
          {artifact.input_refs?.map((ref) => <li key={ref}><RefLink ref={ref} /></li>)}
        </ul>
      </Panel>

      <Panel title="Output references">
        <ul className="list-reset">
          {artifact.output_refs?.map((ref) => <li key={ref}><RefLink ref={ref} /></li>)}
        </ul>
      </Panel>

      <Panel title="Artifact neighbors">
        <p><strong>Upstream:</strong></p>
        <ul className="list-reset">
          {(artifact.upstream_artifact_ids || []).map((id) => <li key={id}><Link to={`/lineage/${id}`}>{id}</Link></li>)}
          {!artifact.upstream_artifact_ids?.length ? <li>None</li> : null}
        </ul>
        <p><strong>Downstream:</strong></p>
        <ul className="list-reset">
          {(artifact.downstream_artifact_ids || []).map((id) => <li key={id}><Link to={`/lineage/${id}`}>{id}</Link></li>)}
          {!artifact.downstream_artifact_ids?.length ? <li>None</li> : null}
        </ul>
      </Panel>
    </div>
  )
}
