import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { KpiCommandStrip, TrendBand } from '../components/domain/CommandCenterModules'
import { DataDiagnostics } from '../components/domain/DataDiagnostics'
import { CtaButtonRow, Panel } from '../components/primitives/Primitives'
import { loadEventsData, loadLineageArtifactsData, toUiDiagnostics } from '../lib/api'
import { toScopedPath } from '../lib/scopedLink'
import { OperationalStatus, Severity } from '../domain/uiVocabulary'

export function QualityPage() {
  const outletContext = useOutletContext()
  const globalContext = outletContext?.globalContext || {}
  const [events, setEvents] = useState([])
  const [artifacts, setArtifacts] = useState([])
  const [diagnostics, setDiagnostics] = useState([])

  useEffect(() => {
    Promise.all([loadEventsData(), loadLineageArtifactsData()])
      .then(([eventsPayload, lineagePayload]) => {
        setEvents(eventsPayload.events)
        setArtifacts(lineagePayload.artifacts)
        setDiagnostics([...eventsPayload.diagnostics, ...lineagePayload.diagnostics])
      })
      .catch((error) => setDiagnostics(toUiDiagnostics(error, 'quality')))
  }, [])

  const qualityEvents = useMemo(() => events.filter((event) => event.type?.includes('inspection') || event.type?.includes('quality')), [events])
  const qualityKpiTiles = useMemo(
    () => [
      { id: 'quality-events', label: 'Inspection events', value: String(qualityEvents.length), status: qualityEvents.length > 2 ? OperationalStatus.ELEVATED : OperationalStatus.WATCH, score: qualityEvents.length > 2 ? 74 : 42 },
      { id: 'lineage-evidence', label: 'Lineage artifacts', value: String(artifacts.length), status: artifacts.length > 20 ? OperationalStatus.NORMAL : OperationalStatus.WATCH, score: artifacts.length > 20 ? 83 : 61 },
    ],
    [artifacts.length, qualityEvents.length]
  )
  const qualityTrend = useMemo(
    () => [
      { label: 'Defect containment pressure', value: qualityEvents.length > 2 ? 78 : 48, severity: qualityEvents.length > 2 ? Severity.CRITICAL : Severity.WATCH, annotation: `${qualityEvents.length} quality signals in active scope` },
      { label: 'Evidence confidence', value: artifacts.length > 20 ? 82 : 58, severity: artifacts.length > 20 ? Severity.NORMAL : Severity.ELEVATED, annotation: `${artifacts.length} lineage artifacts available` },
    ],
    [artifacts.length, qualityEvents.length]
  )

  return (
    <div className="stack">
      <h1>Quality Lens</h1>
      <p className="meta">Defect pressure, inspection evidence, and quality-to-business impact traceability.</p>
      <DataDiagnostics diagnostics={diagnostics} />
      <KpiCommandStrip title="Quality signal strip" tiles={qualityKpiTiles} />
      <TrendBand rows={qualityTrend} />
      <Panel title="Quality investigation links">
        <CtaButtonRow
          actions={[
            { key: 'investigate', label: 'Investigate', to: toScopedPath('/events', globalContext, { eventClass: 'quality', correlatedOnly: true }) },
            { key: 'compare', label: 'Compare', to: toScopedPath('/impact-analysis', globalContext, { mode: 'upstream-cause' }) },
            { key: 'lineage', label: 'Explain lineage', to: toScopedPath(`/lineage/${artifacts[0]?.id || 'LIN_0039'}`, globalContext) },
            { key: 'export', label: 'Export', to: toScopedPath('/quality', globalContext, { export: 'brief' }) },
          ]}
        />
      </Panel>
      <Panel title="Inspection and quality events">
        <ul className="row-list">
          {qualityEvents.map((event) => (
            <li key={event.id}>
              <strong>{event.id}</strong> — {event.type}
              <div className="meta">{event.occurred_at_utc}</div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
