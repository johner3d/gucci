import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImpactSummary } from '../components/domain/ImpactSummary'
import { EventTimeline } from '../components/domain/EventTimeline'
import { loadJSON } from '../lib/api'

const featuredObjects = ['ASSET_PAINT_ROBOT_07', 'ORD_10045', 'SU_900001', 'KPIOBS_2101']

export function OverviewPage() {
  const [pages, setPages] = useState([])

  useEffect(() => {
    loadJSON('/data/generated/v1/ui/pages.json').then(setPages)
  }, [])

  const page = pages[0]
  if (!page) return <p>Loading overview…</p>

  return (
    <div className="stack">
      <h1>{page.title}</h1>
      <ImpactSummary cards={page.cards} />
      <EventTimeline events={page.timeline} />

      <section className="panel stack">
        <h2>Object registry quick-links</h2>
        <ul className="list-reset">
          {featuredObjects.map((id) => (
            <li key={id}><Link to={`/objects/${id}`}>{id}</Link></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
