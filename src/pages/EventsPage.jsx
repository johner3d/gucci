import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { EventTimeline } from '../components/domain/EventTimeline'
import { loadEventsData, loadLineageArtifactsData, loadProcessData, toUiDiagnostics } from '../lib/api'

const eventToStepHints = [
  { match: 'maintenance', stepType: 'monitoring' },
  { match: 'disturbance', stepType: 'triage' },
  { match: 'inspection', stepType: 'containment' },
  { match: 'quality', stepType: 'verification' },
  { match: 'kpi', stepType: 'recovery' },
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

  const jumpToGraph = (event) => {
    const focus = event.asset_id || event.station_id || event.serial_unit_id || event.inspection_id || event.id
    navigate(`/graph${asScopedSearch(globalContext, { focus, mode: 'impact', sourceEvent: event.id })}`)
  }

  const jumpToProcess = (event) => {
    const hint = eventToStepHints.find((entry) => event.type?.includes(entry.match))
    const step = (hint && processStepByType[hint.match]) || processData?.canvas?.steps?.[0]?.id
    navigate(`/process${asScopedSearch(globalContext, { step, event: event.id })}`)
  }

  const jumpToEntity = (event) => {
    const entityId = event.asset_id || event.serial_unit_id || event.station_id || event.inspection_id
    if (!entityId) return
    navigate(`/objects/${entityId}${asScopedSearch(globalContext, { event: event.id })}`)
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
    navigate(`/lineage/${artifactId}${asScopedSearch(globalContext, { event: event.id })}`)
  }

  if (!events.length && !diagnostics.length) return <p>Loading events…</p>

  return (
    <div className="stack">
      <h1>Events</h1>
      <DataDiagnostics diagnostics={diagnostics} />
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
        />
      ) : (
        <p>No events available.</p>
      )}
    </div>
  )
}
