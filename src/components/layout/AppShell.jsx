import { NavLink, Outlet, useLocation } from 'react-router-dom'

const routes = [
  { to: '/', label: 'Overview', end: true },
  { to: '/process', label: 'Process' },
  { to: '/events', label: 'Events' },
  { to: '/graph', label: 'Graph' },
  { to: '/objects/KPIOBS_2101', label: 'Objects' },
  { to: '/lineage/LIN_0039', label: 'Lineage' },
]

function toCrumbs(pathname) {
  if (pathname === '/') return ['Overview']
  return pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part))
}

export function AppShell() {
  const location = useLocation()
  const crumbs = toCrumbs(location.pathname)

  return (
    <div className="app-shell">
      <aside className="shell-nav">
        <h3>Issue Explorer</h3>
        <ul className="nav-list">
          {routes.map((route) => (
            <li key={route.to}>
              <NavLink to={route.to} end={route.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {route.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>

      <main className="shell-main">
        <div className="context-bar meta">Context: Paint Line A Incident / Shift 1</div>
        <div className="breadcrumb-zone meta">{crumbs.join(' / ')}</div>
        <Outlet />
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
