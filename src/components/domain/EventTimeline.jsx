import { Panel } from '../primitives/Primitives'

export function EventTimeline({ events = [] }) {
  const sorted = [...events].sort((a, b) => (a.occurred_at_utc > b.occurred_at_utc ? 1 : -1))

  return (
    <Panel title="Event timeline">
      <ul className="timeline">
        {sorted.map((event) => (
          <li key={event.id}>
            <strong>{event.id}</strong> — {event.type}
            <div className="meta">{event.occurred_at_utc}</div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
