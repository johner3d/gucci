import { Link } from 'react-router-dom'
import { Panel } from '../primitives/Primitives'

export function EvidenceAnchorPanel({ anchor = '', scopedPathFor }) {
  if (!anchor) return null
  const isLineageArtifact = anchor.startsWith('LIN_')
  const objectRouteHints = /^(ASSET_|ORD_|SU_|KPIOBS_|ST_|MA_|INSP_|RES_)/.test(anchor)

  return (
    <Panel title="Evidence anchor context">
      <p className="meta">
        Active anchor: <strong>{anchor}</strong>. Graph, Object, and Lineage views are synchronized around this evidence focus.
      </p>
      <div className="button-row">
        <Link className="btn" to={scopedPathFor('/graph', { highlight: anchor, focus: anchor })}>Graph anchor</Link>
        <Link className="btn" to={scopedPathFor('/events', { highlight: anchor })}>Events anchor</Link>
        <Link className="btn" to={scopedPathFor(isLineageArtifact ? `/lineage/${anchor}` : '/lineage', { highlight: anchor, anchor })}>Lineage anchor</Link>
        {objectRouteHints ? <Link className="btn" to={scopedPathFor(`/object-explorer/${anchor}`, { highlight: anchor, anchor })}>Object anchor</Link> : null}
      </div>
    </Panel>
  )
}
