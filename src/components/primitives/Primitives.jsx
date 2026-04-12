import { Link, useSearchParams } from 'react-router-dom'

function useScopedQuery() {
  const [searchParams] = useSearchParams()
  return searchParams.toString()
}

export function Card({ children, className = '', nextActions = [] }) {
  const query = useScopedQuery()
  const fallbackActions = nextActions.length
    ? nextActions
    : [
        { label: 'Continue in Graph', to: '/graph' },
        { label: 'Review Events', to: '/events' },
      ]

  return (
    <article className={`card ${className}`.trim()}>
      {children}
      <div className="panel-next-actions">
        <strong className="meta">Next actions</strong>
        <div className="button-row">
          {fallbackActions.map((action) => (
            <Link key={`${action.to}-${action.label}`} className="btn" to={`${action.to}${query ? `?${query}` : ''}`}>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </article>
  )
}

export function Panel({ title, children, nextActions = [] }) {
  const query = useScopedQuery()
  const fallbackActions = nextActions.length
    ? nextActions
    : [
        { label: 'Open Graph', to: '/graph' },
        { label: 'Open Object Explorer', to: '/object-explorer' },
      ]

  return (
    <section className="panel stack">
      {title ? <h2>{title}</h2> : null}
      {children}
      <div className="panel-next-actions">
        <strong className="meta">Next actions</strong>
        <div className="button-row">
          {fallbackActions.map((action) => (
            <Link key={`${action.to}-${action.label}`} className="btn" to={`${action.to}${query ? `?${query}` : ''}`}>
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
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
