import { Link } from 'react-router-dom'
import { Panel } from '../primitives/Primitives'

function RefLink({ ref }) {
  if (ref.startsWith('LIN_')) return <Link to={`/lineage/${ref}`}>{ref}</Link>
  if (ref.startsWith('EVT_')) return <Link to={`/events?focus=${ref}`}>{ref}</Link>
  if (/^(STEP_|ACT_|SUBPROC_|PROC_)/.test(ref)) return <Link to={`/process?focus=${ref}`}>{ref}</Link>
  if (/^(KPIOBS_|ORD_|SU_|ASSET_)/.test(ref)) return <Link to={`/objects/${ref}`}>{ref}</Link>
  return <span>{ref}</span>
}

function BacklinkGroup({ title, refs = [] }) {
  return (
    <div>
      <p><strong>{title}:</strong></p>
      <ul className="list-reset">
        {refs.map((ref) => <li key={ref}><RefLink ref={ref} /></li>)}
        {!refs.length ? <li>None</li> : null}
      </ul>
    </div>
  )
}

function BusinessNarrativePanel({ artifact }) {
  return (
    <Panel title={`Business trust narrative: ${artifact.id}`}>
      <p><strong>Why trusted:</strong> {artifact.rationale || 'No rationale provided.'}</p>
      <p><strong>Business impact pathway:</strong> {artifact.business_narrative || 'No explicit business narrative available.'}</p>
      <p><strong>Provenance class:</strong> {artifact.provenance_class || 'Unclassified'}</p>
    </Panel>
  )
}

function TechnicalDerivationPanel({ artifact }) {
  return (
    <Panel title="Technical derivation chain">
      <p><strong>Artifact type:</strong> {artifact.artifact_type}</p>
      <p><strong>Rule:</strong> {artifact.rule_name}</p>
      <p><strong>Version:</strong> {artifact.version}</p>
      <p><strong>Inputs:</strong></p>
      <ul className="list-reset">
        {artifact.input_refs?.map((ref) => <li key={ref}><RefLink ref={ref} /></li>)}
        {!artifact.input_refs?.length ? <li>None</li> : null}
      </ul>
      <p><strong>Outputs:</strong></p>
      <ul className="list-reset">
        {artifact.output_refs?.map((ref) => <li key={ref}><RefLink ref={ref} /></li>)}
        {!artifact.output_refs?.length ? <li>None</li> : null}
      </ul>
      <p><strong>Upstream artifacts:</strong></p>
      <ul className="list-reset">
        {(artifact.upstream_artifact_ids || []).map((id) => <li key={id}><Link to={`/lineage/${id}`}>{id}</Link></li>)}
        {!artifact.upstream_artifact_ids?.length ? <li>None</li> : null}
      </ul>
      <p><strong>Downstream artifacts:</strong></p>
      <ul className="list-reset">
        {(artifact.downstream_artifact_ids || []).map((id) => <li key={id}><Link to={`/lineage/${id}`}>{id}</Link></li>)}
        {!artifact.downstream_artifact_ids?.length ? <li>None</li> : null}
      </ul>
    </Panel>
  )
}

export function LineageTrustPanel({ artifact }) {
  return (
    <div className="stack">
      <BusinessNarrativePanel artifact={artifact} />
      <TechnicalDerivationPanel artifact={artifact} />
      <Panel title="Direct backlinks">
        <BacklinkGroup title="Impacted KPIs" refs={artifact.backlinks?.kpis || []} />
        <BacklinkGroup title="Impacted entities" refs={artifact.backlinks?.entities || []} />
        <BacklinkGroup title="Impacted process steps" refs={artifact.backlinks?.process_steps || []} />
        <BacklinkGroup title="Impacted events" refs={artifact.backlinks?.events || []} />
      </Panel>
    </div>
  )
}
