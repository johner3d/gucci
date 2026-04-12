import { useEffect, useState } from 'react'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { EventTimeline } from '../components/domain/EventTimeline'
import { loadEventsData, toUiDiagnostics } from '../lib/api'

export function EventsPage() {
  const [events, setEvents] = useState([])
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    loadEventsData()
      .then((payload) => {
        setEvents(payload.events)
        setDiagnostics(payload.diagnostics)
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'events')))
  }, [])

  if (!events.length && !diagnostics.length) return <p>Loading events…</p>

  return (
    <div className="stack">
      <h1>Events</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      {events.length ? <EventTimeline events={events} /> : <p>No events available.</p>}
    </div>
  )
}
