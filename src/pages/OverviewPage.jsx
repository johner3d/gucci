import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { ImpactSummary } from '../components/domain/ImpactSummary'
import { EventTimeline } from '../components/domain/EventTimeline'
import { loadOverviewPageData, toUiDiagnostics } from '../lib/api'

const featuredObjects = ['ASSET_PAINT_ROBOT_07', 'ORD_10045', 'SU_900001', 'KPIOBS_2101']

export function OverviewPage() {
  const [page, setPage] = useState(null)
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    loadOverviewPageData()
      .then((payload) => {
        setPage(payload.page)
        setDiagnostics(payload.diagnostics)
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'overview')))
  }, [])

  if (!page && !diagnostics.length) return <p>Loading overview…</p>

  return (
    <div className="stack">
      <h1>{page?.title || 'Overview'}</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      {page ? (
        <>
          <ImpactSummary cards={page.cards} />
          <EventTimeline events={page.timeline} />
        </>
      ) : (
        <p>Overview content unavailable.</p>
      )}

      <section className="panel stack">
        <h2>Object search quick-links</h2>
        <ul className="list-reset">
          {featuredObjects.map((id) => (
            <li key={id}><Link to={`/object-explorer/${id}?entry=overview`}>{id}</Link></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
