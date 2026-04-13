import { Link, useSearchParams } from 'react-router-dom'
import {
  OperationalStatus,
  Severity,
  Trust,
  toApprovedOperationalStatus,
  toApprovedSeverity,
  toApprovedTrust,
} from '../../domain/uiVocabulary'

const CTA_ORDER = ['investigate', 'compare', 'lineage', 'export']

function useScopedQuery() {
  const [searchParams] = useSearchParams()
  return searchParams.toString()
}

function toCtaKey(action) {
  if (action.key) return action.key
  const label = String(action.label || '').toLowerCase()
  if (label.includes('invest')) return 'investigate'
  if (label.includes('compar') || label.includes('impact')) return 'compare'
  if (label.includes('lineage')) return 'lineage'
  if (label.includes('export')) return 'export'
  return 'investigate'
}

function orderActions(actions = []) {
  return [...actions].sort((left, right) => CTA_ORDER.indexOf(toCtaKey(left)) - CTA_ORDER.indexOf(toCtaKey(right)))
}

export function CtaButtonRow({ actions = [], query = '' }) {
  return (
    <div className="button-row">
      {orderActions(actions).map((action) => (
        <Link key={`${action.to}-${action.label}`} className="btn" to={`${action.to}${query ? `?${query}` : ''}`}>
          {action.label}
        </Link>
      ))}
    </div>
  )
}

function defaultActions() {
  return [
    { key: 'investigate', label: 'Investigate', to: '/events' },
    { key: 'compare', label: 'Compare', to: '/impact-analysis' },
    { key: 'lineage', label: 'Explain lineage', to: '/lineage' },
    { key: 'export', label: 'Export', to: '/executive?export=brief' },
  ]
}

export function Card({ children, className = '', nextActions = [] }) {
  const query = useScopedQuery()
  const fallbackActions = nextActions.length ? nextActions : defaultActions()

  return (
    <article className={`card ${className}`.trim()}>
      {children}
      <div className="panel-next-actions">
        <strong className="meta">Next actions</strong>
        <CtaButtonRow actions={fallbackActions} query={query} />
      </div>
    </article>
  )
}

export function Panel({ title, children, nextActions = [] }) {
  const query = useScopedQuery()
  const fallbackActions = nextActions.length ? nextActions : defaultActions()

  return (
    <section className="panel stack">
      {title ? <h2>{title}</h2> : null}
      {children}
      <div className="panel-next-actions">
        <strong className="meta">Next actions</strong>
        <CtaButtonRow actions={fallbackActions} query={query} />
      </div>
    </section>
  )
}

export function CardRow({ primary, secondary, tertiary }) {
  return (
    <div className="card-row-hierarchy">
      <div className="card-row-primary">{primary}</div>
      {secondary ? <div className="card-row-secondary">{secondary}</div> : null}
      {tertiary ? <div className="card-row-tertiary">{tertiary}</div> : null}
    </div>
  )
}

export function StatePanel({ state = 'loading', title, action }) {
  const copy = {
    loading: {
      title: title || 'Loading command context',
      description: 'Collecting incident-scoped evidence. You can continue once the primary cards are hydrated.',
      actionLabel: 'Investigate',
      actionTo: '/events',
    },
    empty: {
      title: title || 'No records in scope',
      description: 'No scoped records matched this view. Compare neighboring domains or adjust scope filters.',
      actionLabel: 'Compare',
      actionTo: '/impact-analysis',
    },
    error: {
      title: title || 'Unable to load this view',
      description: 'Data diagnostics captured an error. Explain lineage or retry from the investigation workspace.',
      actionLabel: 'Explain lineage',
      actionTo: '/lineage',
    },
  }[state]

  return (
    <section className="panel state-panel stack">
      <h2>{copy.title}</h2>
      <p className="meta">{copy.description}</p>
      <div className="button-row">
        <Link className="btn" to={action?.to || copy.actionTo}>{action?.label || copy.actionLabel}</Link>
      </div>
    </section>
  )
}

export function VocabularyBadge({ type = 'severity', value = '' }) {
  const normalized =
    type === 'trust'
      ? toApprovedTrust(value, Trust.PROVISIONAL)
      : type === 'status'
        ? toApprovedOperationalStatus(value, OperationalStatus.WATCH)
        : toApprovedSeverity(value, Severity.WATCH)

  return <span className={`chip badge badge-${type}-${normalized}`.trim()}>{normalized}</span>
}

export function Stack({ children, className = '' }) {
  return <div className={`stack ${className}`.trim()}>{children}</div>
}

export function Button({ children, primary = false, ...props }) {
  return (
    <button className={`btn ${primary ? 'btn-primary' : ''}`.trim()} {...props}>
      {children}
    </button>
  )
}
