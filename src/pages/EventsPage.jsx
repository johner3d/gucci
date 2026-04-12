import { useEffect, useState } from 'react'
import { EventTimeline } from '../components/domain/EventTimeline'
import { loadJSON } from '../lib/api'

export function EventsPage() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    loadJSON('/data/generated/v1/canonical/events.json').then(setEvents)
  }, [])

  if (!events.length) return <p>Loading events…</p>

  return (
    <div className="stack">
      <h1>Events</h1>
      <EventTimeline events={events} />
    </div>
  )
}
