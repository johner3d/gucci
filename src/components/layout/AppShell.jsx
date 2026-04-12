import { NavLink, Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { IncidentTruthSelectors } from './IncidentTruthSelectors'
import { buildSemanticBreadcrumbs, readContextKernel, toKernelQuery } from '../../lib/contextKernel'

const spaceRoutes = [
  { to: '/executive', label: 'Executive', end: true },
  { to: '/production', label: 'Production' },
  { to: '/quality', label: 'Quality' },
  { to: '/logistics', label: 'Logistics' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/process', label: 'Process' },
  { to: '/events', label: 'Events' },
  { to: '/graph', label: 'Graph' },
  { to: '/object-explorer', label: 'Object Explorer' },
  { to: '/lineage', label: 'Lineage' },
  { to: '/impact-analysis', label: 'Impact Analysis' },
]

const transitionRules = [
  {
    id: 'kpi-breach-to-graph',
    from: 'Executive',
    trigger: 'KPI breach detected',
    to: 'Graph',
    action: 'Open downstream impact graph centered on the breached KPI observation.',
    route: '/graph',
    patch: { mode: 'downstream-impact' },
  },
  {
    id: 'event-to-process',
    from: 'Events',
    trigger: 'Event references a process step',
    to: 'Process',
    action: 'Jump to the impacted process step with event id preserved.',
    route: '/process',
    patch: { source: 'event' },
  },
  {
    id: 'graph-node-to-entity-detail',
    from: 'Graph',
    trigger: 'Graph node selected',
    to: 'Object Explorer',
    action: 'Open entity detail while retaining graph focus and selected node.',
    route: '/object-explorer/:id',
    patch: { source: 'graph' },
  },
  {
    id: 'lineage-back-to-impact',
    from: 'Lineage',
    trigger: 'Lineage artifact mapped to KPI/object',
    to: 'Impact Analysis',
    action: 'Return to impacted KPI or object with lineage artifact context attached.',
    route: '/impact-analysis',
    patch: { source: 'lineage' },
  },
]

export function AppShell() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const contextKernel = readContextKernel(searchParams)

  const scopedParams = Object.fromEntries(searchParams.entries())
  const routeContract = {
    ...contextKernel,
    focus: searchParams.get('focus') || contextKernel.focusEntity,
    selectedNode: searchParams.get('selectedNode') || contextKernel.focusEntity,
    selectedPath: searchParams.get('selectedPath') || '',
  }

  const scopedQuery = toKernelQuery(contextKernel, scopedParams).toString()
  const breadcrumbs = buildSemanticBreadcrumbs(location.pathname, contextKernel)

  return (
    <div className="app-shell">
      <aside className="shell-nav">
        <h3>Issue Explorer</h3>
        <ul className="nav-list">
          {spaceRoutes.map((route) => (
            <li key={route.to}>
              <NavLink to={`${route.to}?${scopedQuery}`} end={route.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {route.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>

      <main className="shell-main">
        <div className="context-bar meta">
          Context kernel: {contextKernel.plant} / {contextKernel.line} / {contextKernel.severity} / {contextKernel.time}
        </div>
        <IncidentTruthSelectors contextKernel={contextKernel} searchParams={searchParams} setSearchParams={setSearchParams} />
        <div className="context-bar meta">
          Scope: {contextKernel.incidentScope.incidentId} · Focus: {contextKernel.focusEntity}
        </div>
        <div className="context-bar meta">Hypothesis: {contextKernel.hypothesis}</div>
        <div className="breadcrumb-zone">
          <ul className="semantic-crumbs list-reset">
            {breadcrumbs.map((crumb, idx) => (
              <li key={`${crumb.label}-${idx}`}>
                <Link to={`${crumb.to}?${scopedQuery}`}>{crumb.label}</Link>
                <div className="meta">{crumb.hint}</div>
              </li>
            ))}
          </ul>
        </div>
        <Outlet context={{ globalContext: routeContract, contextKernel, incidentScope: contextKernel.incidentScope, transitionRules }} />
      </main>

      <aside className="shell-rail">
        <h4>Transition rules</h4>
        <ul className="rail-list meta">
          {transitionRules.map((rule) => (
            <li key={rule.id}>
              {rule.from} → {rule.to}: {rule.trigger}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
