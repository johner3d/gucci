import { Panel } from '../primitives/Primitives'

const EVENT_ENTITY_KEYS = ['asset_id', 'station_id', 'serial_unit_id', 'inspection_id', 'maintenance_activity_id', 'order_id', 'kpi_observation_id']

function toEventClass(eventType = '') {
  if (eventType.includes('threshold') || eventType.includes('disturbance') || eventType.includes('violation')) return 'anomaly'
  if (eventType.includes('inspection') || eventType.includes('quality')) return 'quality'
  if (eventType.includes('maintenance')) return 'operations'
  if (eventType.includes('kpi')) return 'kpi'
  return 'process'
}

function toDomain(event = {}) {
  if (event.asset_id || event.station_id || event.maintenance_activity_id) return 'asset'
  if (event.serial_unit_id || event.order_id) return 'production'
  if (event.inspection_id) return 'quality'
  if (event.kpi_observation_id || event.kpi) return 'kpi'
  return 'general'
}

function buildTimelineEvents(events) {
  return events
    .map((event) => {
      const occurredAt = Date.parse(event.occurred_at_utc)
      const relatedEntityIds = EVENT_ENTITY_KEYS.map((key) => event[key]).filter(Boolean)
      const eventClass = event.event_class || toEventClass(event.type)
      const domain = event.domain || toDomain(event)
      const sequenceWindow = event.sequence_window || (eventClass === 'anomaly' ? 'containment_window' : 'monitoring_window')
      const anomaly = event.anomaly || eventClass === 'anomaly'
      const kpiCorrelation = event.kpi_correlation || eventClass === 'kpi' || event.type?.includes('inspection')

      return {
        ...event,
        occurredAt,
        domain,
        eventClass,
        sequenceWindow,
        anomaly,
        kpiCorrelation,
        relatedEntityIds,
      }
    })
    .sort((a, b) => a.occurredAt - b.occurredAt)
}

function matchesIncidentScope(event, incidentScope) {
  if (!incidentScope) return true
  const typeMatch = (incidentScope.eventTypePrefixes || []).some((prefix) => event.type?.startsWith(prefix))
  const entityMatch = (incidentScope.relatedEntityIds || []).some((entityId) => event.relatedEntityIds.includes(entityId))
  return typeMatch || entityMatch
}

function toTracks(events) {
  return Object.entries(
    events.reduce((acc, event) => {
      const trackId = `${event.domain}::${event.eventClass}`
      if (!acc[trackId]) {
        acc[trackId] = { id: trackId, domain: event.domain, eventClass: event.eventClass, events: [] }
      }
      acc[trackId].events.push(event)
      return acc
    }, {})
  )
    .map(([, track]) => track)
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.eventClass.localeCompare(b.eventClass))
}

function toLabel(value) {
  return value
    .split('_')
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ')
}

export function EventTimeline({
  events = [],
  filters,
  onFiltersChange,
  incidentScope,
  onJumpToGraph,
  onJumpToProcess,
  onJumpToEntity,
  onJumpToLineage,
  highlightedId,
  onHighlight,
}) {
  const normalized = buildTimelineEvents(events)
  const domains = [...new Set(normalized.map((event) => event.domain))]
  const classes = [...new Set(normalized.map((event) => event.eventClass))]

  const effectiveFilters = {
    domain: filters?.domain || 'all',
    eventClass: filters?.eventClass || 'all',
    incidentOnly: Boolean(filters?.incidentOnly),
    anomaliesOnly: Boolean(filters?.anomaliesOnly),
    correlatedOnly: Boolean(filters?.correlatedOnly),
  }

  const filteredEvents = normalized.filter((event) => {
    if (effectiveFilters.domain !== 'all' && event.domain !== effectiveFilters.domain) return false
    if (effectiveFilters.eventClass !== 'all' && event.eventClass !== effectiveFilters.eventClass) return false
    if (effectiveFilters.incidentOnly && !matchesIncidentScope(event, incidentScope)) return false
    if (effectiveFilters.anomaliesOnly && !event.anomaly) return false
    if (effectiveFilters.correlatedOnly && !event.kpiCorrelation) return false
    return true
  })

  const tracks = toTracks(filteredEvents)

  return (
    <Panel title="Event timeline by domain track">
      {onFiltersChange ? (
        <div className="timeline-filter-bar">
          <label>
            Domain
            <select value={effectiveFilters.domain} onChange={(event) => onFiltersChange({ domain: event.target.value })}>
              <option value="all">All domains</option>
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {toLabel(domain)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Event class
            <select value={effectiveFilters.eventClass} onChange={(event) => onFiltersChange({ eventClass: event.target.value })}>
              <option value="all">All classes</option>
              {classes.map((eventClass) => (
                <option key={eventClass} value={eventClass}>
                  {toLabel(eventClass)}
                </option>
              ))}
            </select>
          </label>

          <label className="timeline-check">
            <input
              type="checkbox"
              checked={effectiveFilters.incidentOnly}
              onChange={(event) => onFiltersChange({ incidentOnly: event.target.checked })}
            />
            Incident scope only
          </label>

          <label className="timeline-check">
            <input
              type="checkbox"
              checked={effectiveFilters.anomaliesOnly}
              onChange={(event) => onFiltersChange({ anomaliesOnly: event.target.checked })}
            />
            Anomalies only
          </label>

          <label className="timeline-check">
            <input
              type="checkbox"
              checked={effectiveFilters.correlatedOnly}
              onChange={(event) => onFiltersChange({ correlatedOnly: event.target.checked })}
            />
            KPI correlated only
          </label>
        </div>
      ) : null}

      {!tracks.length ? <p className="meta">No timeline events matched the current filters.</p> : null}

      <div className="timeline-tracks">
        {tracks.map((track) => (
          <section key={track.id} className="timeline-track">
            <header className="timeline-track-header">
              <strong>{toLabel(track.domain)}</strong>
              <span className="chip">{toLabel(track.eventClass)}</span>
              <span className="meta">{track.events.length} events</span>
            </header>

            <ul className="timeline list-reset">
              {track.events.map((event) => (
                <li
                  key={event.id}
                  className={`timeline-event ${event.anomaly ? 'is-anomaly' : ''} ${highlightedId === event.id ? 'is-highlighted' : ''}`.trim()}
                >
                  <div className="timeline-event-head">
                    <strong>{event.id}</strong>
                    <span className="meta">{event.occurred_at_utc}</span>
                  </div>
                  <div>
                    {event.type}
                    <div className="timeline-markers">
                      <span className="chip">window: {toLabel(event.sequenceWindow)}</span>
                      {event.anomaly ? <span className="chip chip-danger">anomaly marker</span> : null}
                      {event.kpiCorrelation ? <span className="chip chip-primary">kpi-correlation</span> : null}
                    </div>
                  </div>

                  {onJumpToGraph || onJumpToProcess || onJumpToEntity || onJumpToLineage ? (
                    <div className="button-row timeline-actions">
                      {onJumpToGraph ? (
                        <button type="button" className="btn" onClick={() => onJumpToGraph(event)}>
                          Graph focus
                        </button>
                      ) : null}
                      {onJumpToProcess ? (
                        <button type="button" className="btn" onClick={() => onJumpToProcess(event)}>
                          Process step
                        </button>
                      ) : null}
                      {onJumpToEntity ? (
                        <button type="button" className="btn" onClick={() => onJumpToEntity(event)} disabled={!event.relatedEntityIds.length}>
                          Entity detail
                        </button>
                      ) : null}
                      {onJumpToLineage ? (
                        <button type="button" className="btn" onClick={() => onJumpToLineage(event)}>
                          Lineage artifact
                        </button>
                      ) : null}
                      {onHighlight ? (
                        <button type="button" className="btn" onClick={() => onHighlight(event.id)}>
                          Cross-highlight
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Panel>
  )
}
