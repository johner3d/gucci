import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'

const routes = [
  { to: '/', label: 'Overview', end: true },
  { to: '/process', label: 'Process' },
  { to: '/events', label: 'Events' },
  { to: '/graph', label: 'Graph' },
  { to: '/objects/KPIOBS_2101', label: 'Objects' },
  { to: '/lineage/LIN_0039', label: 'Lineage' },
]

const defaultGlobalContext = {
  plant: 'PLANT_DE_01',
  line: 'LINE_PAINT_A',
  time: '2026-01-15T06:00:00Z/2026-01-15T14:00:00Z',
  severity: 'high',
}

const defaultIncidentScope = {
  incidentId: 'INC_PAINT_A_20260115_01',
  relatedEntityIds: ['ASSET_PAINT_ROBOT_07', 'ST_PAINT_BOOTH_03', 'SU_900001', 'ORD_10045', 'KPIOBS_2101'],
  eventTypePrefixes: ['maintenance', 'asset', 'inspection', 'quality', 'kpi'],
}

function toCrumbs(pathname) {
  if (pathname === '/') return ['Overview']
  return pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part))
}

export function AppShell() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const crumbs = toCrumbs(location.pathname)

  const scopedParams = Object.fromEntries(searchParams.entries())

  const globalContext = {
    plant: searchParams.get('plant') || defaultGlobalContext.plant,
    line: searchParams.get('line') || defaultGlobalContext.line,
    time: searchParams.get('time') || defaultGlobalContext.time,
    severity: searchParams.get('severity') || defaultGlobalContext.severity,
    focus: searchParams.get('focus') || 'KPIOBS_2101',
    selectedNode: searchParams.get('selectedNode') || searchParams.get('focus') || 'KPIOBS_2101',
    selectedPath: searchParams.get('selectedPath') || '',
  }

  const scopedQuery = new URLSearchParams({ ...globalContext, ...scopedParams }).toString()

  return (
    <div className="app-shell">
      <aside className="shell-nav">
        <h3>Issue Explorer</h3>
        <ul className="nav-list">
          {routes.map((route) => (
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
          Context: {globalContext.plant} / {globalContext.line} / {globalContext.severity} / {globalContext.time}
        </div>
        <div className="breadcrumb-zone meta">{crumbs.join(' / ')}</div>
        <Outlet context={{ globalContext, incidentScope: defaultIncidentScope }} />
      </main>

      <aside className="shell-rail">
        <h4>Action rail</h4>
        <ul className="rail-list meta">
          <li>Pin suspicious nodes</li>
          <li>Trace upstream lineage</li>
          <li>Export incident package</li>
        </ul>
      </aside>
    </div>
  )
}
