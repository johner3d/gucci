import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { EventSequenceBoard } from '../components/domain/CommandCenterModules'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { EventTimeline } from '../components/domain/EventTimeline'
import { Panel } from '../components/primitives/Primitives'
import { loadEventsData, loadLineageArtifactsData, loadProcessData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'

const eventToStepHints = [
  { match: 'maintenance', stepType: 'handoff' },
  { match: 'disturbance', stepType: 'state_transition' },
  { match: 'inspection', stepType: 'work_step' },
  { match: 'quality', stepType: 'decision_point' },
  { match: 'kpi', stepType: 'process' },
]

function asScopedSearch(globalContext, extra = {}) {
  const params = new URLSearchParams({ ...globalContext, ...extra })
  return `?${params.toString()}`
}

export function EventsPage() {
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const incidentScope = outletContext?.incidentScope
  const [searchParams] = useSearchParams()
  const highlightedId = searchParams.get('highlight') || searchParams.get('anchor') || ''

  const [events, setEvents] = useState([])
  const [diagnostics, setDiagnostics] = useState([])
  const [lineageArtifacts, setLineageArtifacts] = useState([])
  const [processData, setProcessData] = useState(null)

  const [filters, setFilters] = useState({
    domain: 'all',
    eventClass: 'all',
    incidentOnly: true,
    anomaliesOnly: false,
    correlatedOnly: false,
  })

  useEffect(() => {
    Promise.all([loadEventsData(), loadLineageArtifactsData(), loadProcessData()])
      .then(([eventsPayload, lineagePayload, processPayload]) => {
        setEvents(eventsPayload.events)
        setLineageArtifacts(lineagePayload.artifacts)
        setProcessData(processPayload)
        setDiagnostics([...eventsPayload.diagnostics, ...lineagePayload.diagnostics, ...processPayload.diagnostics])
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'events')))
  }, [])

  const lineageByRule = useMemo(() => {
    return lineageArtifacts.reduce((acc, artifact) => {
      acc[artifact.rule_name] = artifact.id
      return acc
    }, {})
  }, [lineageArtifacts])

  const processStepByType = useMemo(() => {
    const steps = processData?.canvas?.steps || []
    return eventToStepHints.reduce((acc, hint) => {
      const step = steps.find((candidate) => candidate.type === hint.stepType)
      if (step) acc[hint.match] = step.id
      return acc
    }, {})
  }, [processData])

  const onFiltersChange = (patch) => setFilters((current) => ({ ...current, ...patch }))

  const sequenceRows = useMemo(() => {
    const groups = events.reduce((acc, event) => {
      const track = event.domain || (event.type?.includes('inspection') ? 'quality' : event.type?.includes('maintenance') ? 'maintenance' : 'production')
      if (!acc[track]) acc[track] = []
      acc[track].push(event)
      return acc
    }, {})

    return Object.entries(groups).map(([track, trackEvents]) => {
      const anomalies = trackEvents.filter((event) => ['threshold', 'disturbance', 'violation'].some((token) => `${event.type}`.includes(token))).length
      const correlated = trackEvents.filter((event) => event.kpi_observation_id || event.type?.includes('inspection') || event.type?.includes('kpi')).length
      return {
        track,
        count: trackEvents.length,
        anomalies,
        correlated,
        severity: anomalies > 0 ? 'high' : correlated > 0 ? 'elevated' : 'watch',
      }
    })
  }, [events])

  const jumpToGraph = (event) => {
    const focus = event.asset_id || event.station_id || event.serial_unit_id || event.inspection_id || event.id
    navigate(`/graph${asScopedSearch(globalContext, { focus, mode: 'downstream-impact', sourceEvent: event.id, highlight: event.id, anchor: event.id })}`)
  }

  const jumpToProcess = (event) => {
    const hint = eventToStepHints.find((entry) => event.type?.includes(entry.match))
    const step = (hint && processStepByType[hint.match]) || processData?.canvas?.steps?.[0]?.id
    navigate(`/process${asScopedSearch(globalContext, { step, event: event.id, highlight: step || event.id, anchor: event.id })}`)
  }

  const jumpToEntity = (event) => {
    const entityId = event.asset_id || event.serial_unit_id || event.station_id || event.inspection_id
    if (!entityId) return
    navigate(`/object-explorer/${entityId}${asScopedSearch(globalContext, { event: event.id, highlight: entityId, anchor: event.id })}`)
  }

  const jumpToLineage = (event) => {
    const ruleName =
      event.type?.includes('maintenance')
        ? 'bind_asset_incident_object_card'
        : event.type?.includes('inspection')
          ? 'derive_defect_rate_kpi'
          : event.type?.includes('disturbance')
            ? 'derive_disturbance_duration_kpi'
            : 'derive_order_delay_risk_kpi'
    const artifactId = lineageByRule[ruleName] || lineageArtifacts[0]?.id
    if (!artifactId) return
    navigate(`/lineage/${artifactId}${asScopedSearch(globalContext, { event: event.id, highlight: artifactId, anchor: event.id })}`)
  }

  if (!events.length && !diagnostics.length) return <p>Loading events…</p>

  return (
    <div className="stack">
      <h1>Events</h1>
      <DataDiagnostics diagnostics={diagnostics} />
      <Panel title="Events workspace interactions">
        <div className="button-row">
          <Link className="btn" to={toScopedPath('/graph', globalContext, { mode: 'downstream-impact' })}>Graph impact path</Link>
          <Link className="btn" to={toScopedPath('/process', globalContext)}>Process lane context</Link>
          <Link className="btn" to={toScopedPath('/impact-analysis', globalContext)}>Impact scoring</Link>
        </div>
      </Panel>
      <EventSequenceBoard rows={sequenceRows} />
      {events.length ? (
        <EventTimeline
          events={events}
          filters={filters}
          onFiltersChange={onFiltersChange}
          incidentScope={incidentScope}
          onJumpToGraph={jumpToGraph}
          onJumpToProcess={jumpToProcess}
          onJumpToEntity={jumpToEntity}
          onJumpToLineage={jumpToLineage}
          highlightedId={highlightedId}
          onHighlight={(eventId) => navigate(`/events${asScopedSearch(globalContext, { ...Object.fromEntries(searchParams.entries()), highlight: eventId, anchor: eventId })}`)}
        />
      ) : (
        <p>No events available.</p>
      )}
    </div>
  )
}
