import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'

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
  { to: '/lineage/LIN_0039', label: 'Lineage' },
  { to: '/impact-analysis', label: 'Impact Analysis' },
]

const defaultInvestigationContext = {
  plant: 'PLANT_DE_01',
  line: 'LINE_PAINT_A',
  time: '2026-01-15T06:00:00Z/2026-01-15T14:00:00Z',
  severity: 'high',
  focusEntity: 'KPIOBS_2101',
  activeHypothesis: 'Paint booth contamination increased rework and delayed outbound delivery.',
}

const defaultIncidentScope = {
  incidentId: 'INC_PAINT_A_20260115_01',
  relatedEntityIds: ['ASSET_PAINT_ROBOT_07', 'ST_PAINT_BOOTH_03', 'SU_900001', 'ORD_10045', 'KPIOBS_2101'],
  eventTypePrefixes: ['maintenance', 'asset', 'inspection', 'quality', 'kpi'],
}

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

function toCrumbs(pathname) {
  if (pathname === '/') return ['Executive']
  return pathname
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part))
}

export function AppShell() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const crumbs = toCrumbs(location.pathname)

  const scopedParams = Object.fromEntries(searchParams.entries())

  const investigationContext = {
    plant: searchParams.get('plant') || defaultInvestigationContext.plant,
    line: searchParams.get('line') || defaultInvestigationContext.line,
    time: searchParams.get('time') || defaultInvestigationContext.time,
    severity: searchParams.get('severity') || defaultInvestigationContext.severity,
    focusEntity: searchParams.get('focusEntity') || searchParams.get('focus') || defaultInvestigationContext.focusEntity,
    activeHypothesis: searchParams.get('activeHypothesis') || defaultInvestigationContext.activeHypothesis,
  }

  const routeContract = {
    ...investigationContext,
    focus: investigationContext.focusEntity,
    selectedNode: searchParams.get('selectedNode') || investigationContext.focusEntity,
    selectedPath: searchParams.get('selectedPath') || '',
  }

  const scopedQuery = new URLSearchParams({ ...routeContract, ...scopedParams }).toString()

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
          Context: {investigationContext.plant} / {investigationContext.line} / {investigationContext.severity} / {investigationContext.time}
        </div>
        <div className="context-bar meta">
          Focus: {investigationContext.focusEntity} · Hypothesis: {investigationContext.activeHypothesis}
        </div>
        <div className="breadcrumb-zone meta">{crumbs.join(' / ')}</div>
        <Outlet context={{ globalContext: routeContract, investigationContext, incidentScope: defaultIncidentScope, transitionRules }} />
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
