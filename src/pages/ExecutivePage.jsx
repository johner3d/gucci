import { Link, useOutletContext } from 'react-router-dom'
import { OverviewPage } from './OverviewPage'
import { Panel } from '../components/primitives/Primitives'
import { toScopedPath } from '../lib/scopedLink'

export function ExecutivePage() {
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}

  return (
    <div className="stack">
      <Panel title="Executive command actions">
        <p className="meta">Direct the investigation using cross-space pivots tied to one incident truth.</p>
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/impact-analysis', globalContext, { mode: 'downstream-impact' })}>Open impact analysis</Link>
          <Link className="btn" to={toScopedPath('/production', globalContext)}>Open production workspace</Link>
          <Link className="btn" to={toScopedPath('/quality', globalContext)}>Open quality workspace</Link>
        </div>
      </Panel>
      <OverviewPage />
    </div>
  )
}
