import { Panel } from '../primitives/Primitives'

function toSeverityTone(value = '') {
  const token = String(value).toLowerCase()
  if (['critical', 'violated', 'high', 'blocked'].some((entry) => token.includes(entry))) return 'danger'
  if (['elevated', 'watch', 'medium', 'degraded'].some((entry) => token.includes(entry))) return 'warning'
  return 'normal'
}

function percent(value) {
  return `${Math.max(0, Math.min(100, Number(value || 0)))}%`
}

export function KpiCommandStrip({ title = 'KPI command strip', tiles = [] }) {
  return (
    <Panel title={title}>
      <div className="kpi-strip">
        {tiles.map((tile) => (
          <article key={tile.id} className={`kpi-tile tone-${toSeverityTone(tile.status)}`.trim()}>
            <div className="meta">{tile.label}</div>
            <div className="kpi-value">{tile.value}</div>
            <div className="chip">status: {tile.status}</div>
            <div className="kpi-progress">
              <div className="kpi-progress-fill" style={{ width: percent(tile.score) }} />
            </div>
          </article>
        ))}
      </div>
    </Panel>
  )
}

export function DomainImpactMatrix({ cells = [] }) {
  return (
    <Panel title="Cross-domain impact matrix">
      <div className="impact-matrix">
        {cells.map((cell) => (
          <article key={cell.domain} className={`impact-cell tone-${toSeverityTone(cell.severity)}`.trim()}>
            <header>
              <strong>{cell.domain}</strong>
              <span className="chip">{cell.severity}</span>
            </header>
            <p className="meta">{cell.summary}</p>
            <div className="meta">Impacted entities: {cell.entityCount}</div>
            <div className="meta">Critical events: {cell.eventCount}</div>
          </article>
        ))}
      </div>
    </Panel>
  )
}

export function TrendBand({ rows = [] }) {
  return (
    <Panel title="Incident trend band">
      <div className="trend-band">
        {rows.map((row) => (
          <div key={row.label} className="trend-row">
            <div className="trend-label">{row.label}</div>
            <div className="trend-track">
              <div className={`trend-fill tone-${toSeverityTone(row.severity)}`.trim()} style={{ width: percent(row.value) }} />
            </div>
            <div className="meta">{row.annotation}</div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
