export function Card({ children, className = '' }) {
  return <article className={`card ${className}`.trim()}>{children}</article>
}

export function Panel({ title, children }) {
  return (
    <section className="panel stack">
      {title ? <h2>{title}</h2> : null}
      {children}
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
