import { OperationalStatus, Severity, toApprovedOperationalStatus, toApprovedSeverity } from '../../domain/uiVocabulary'
import { Panel } from '../primitives/Primitives'

function toSeverityTone(value = '') {
  const severity = toApprovedSeverity(value, Severity.WATCH)
  if ([Severity.CRITICAL, Severity.VIOLATED].includes(severity)) return 'danger'
  if ([Severity.ELEVATED, Severity.WATCH].includes(severity)) return 'warning'
  return 'normal'
}

function toStatusTone(value = '') {
  const status = toApprovedOperationalStatus(value, OperationalStatus.WATCH)
  if (status === OperationalStatus.VIOLATED) return 'danger'
  if ([OperationalStatus.ELEVATED, OperationalStatus.WATCH].includes(status)) return 'warning'
  return 'normal'
}

function percent(value) {
  return `${Math.max(0, Math.min(100, Number(value || 0)))}%`
}

export function KpiCommandStrip({ title = 'KPI command strip', tiles = [] }) {
  return (
    <Panel title={title}>
      <div className="kpi-strip">
        {tiles.map((tile) => {
          const approvedStatus = toApprovedOperationalStatus(tile.status)
          return (
            <article key={tile.id} className={`kpi-tile tone-${toStatusTone(approvedStatus)}`.trim()}>
              <div className="meta">{tile.label}</div>
              <div className="kpi-value">{tile.value}</div>
              <div className="chip">status: {approvedStatus}</div>
              <div className="kpi-progress">
                <div className="kpi-progress-fill" style={{ width: percent(tile.score) }} />
              </div>
            </article>
          )
        })}
      </div>
    </Panel>
  )
}

export function DomainImpactMatrix({ cells = [] }) {
  return (
    <Panel title="Cross-domain impact matrix">
      <div className="impact-matrix">
        {cells.map((cell) => {
          const approvedSeverity = toApprovedSeverity(cell.severity)
          return (
            <article key={cell.domain} className={`impact-cell tone-${toSeverityTone(approvedSeverity)}`.trim()}>
              <header>
                <strong>{cell.domain}</strong>
                <span className="chip">{approvedSeverity}</span>
              </header>
              <p className="meta">{cell.summary}</p>
              <div className="meta">Impacted entities: {cell.entityCount}</div>
              <div className="meta">Critical events: {cell.eventCount}</div>
            </article>
          )
        })}
      </div>
    </Panel>
  )
}

export function TrendBand({ rows = [] }) {
  return (
    <Panel title="Incident trend band">
      <div className="trend-band">
        {rows.map((row) => {
          const approvedSeverity = toApprovedSeverity(row.severity)
          return (
            <div key={row.label} className="trend-row">
              <div className="trend-label">{row.label}</div>
              <div className="trend-track">
                <div className={`trend-fill tone-${toSeverityTone(approvedSeverity)}`.trim()} style={{ width: percent(row.value) }} />
              </div>
              <div className="meta">{row.annotation}</div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

export function ProcessRiskBoard({ rows = [] }) {
  return (
    <Panel title="Process risk board">
      <ul className="row-list">
        {rows.map((row) => {
          const approvedSeverity = toApprovedSeverity(row.severity)
          return (
            <li key={row.id} className={`tone-${toSeverityTone(approvedSeverity)}`.trim()}>
              <strong>{row.label}</strong>
              <div className="meta">Lane: {row.lane}</div>
              <div className="chip">severity: {approvedSeverity}</div>
              <div className="meta">{row.rationale}</div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

export function EventSequenceBoard({ rows = [] }) {
  return (
    <Panel title="Event sequence board">
      <ul className="row-list">
        {rows.map((row) => {
          const approvedSeverity = toApprovedSeverity(row.severity)
          return (
            <li key={row.track} className={`tone-${toSeverityTone(approvedSeverity)}`.trim()}>
              <strong>{row.track}</strong>
              <div className="meta">Events: {row.count}</div>
              <div className="meta">Anomalies: {row.anomalies}</div>
              <div className="meta">Correlated signals: {row.correlated}</div>
              <div className="chip">severity: {approvedSeverity}</div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
