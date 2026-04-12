import { Panel } from '../primitives/Primitives'

export function DataDiagnostics({ diagnostics = [] }) {
  if (!diagnostics.length) return null

  return (
    <Panel title="Data diagnostics">
      <ul className="list-reset diagnostics-list">
        {diagnostics.map((diag, index) => (
          <li key={`${diag.path}-${diag.code}-${index}`}>
            <strong>{diag.level || 'error'}</strong> [{diag.code}] {diag.path} — {diag.message}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
