import { Link } from 'react-router-dom'
import { Panel } from '../primitives/Primitives'

export function EvidenceAnchorPanel({ anchor = '', scopedPathFor }) {
  if (!anchor) return null

  return (
    <Panel title="Evidence anchor context">
      <p className="meta">
        Active anchor: <strong>{anchor}</strong>. Graph, Object, and Lineage views are synchronized around this evidence focus.
      </p>
      <div className="button-row">
        <Link className="btn" to={scopedPathFor('/graph', { highlight: anchor, focus: anchor })}>Graph anchor</Link>
        <Link className="btn" to={scopedPathFor('/events', { highlight: anchor })}>Events anchor</Link>
        <Link className="btn" to={scopedPathFor('/lineage', { highlight: anchor })}>Lineage anchor</Link>
      </div>
    </Panel>
  )
}
