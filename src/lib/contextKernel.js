import { Severity, Trust, toApprovedSeverity, toApprovedTrust } from '../domain/uiVocabulary'

const DEFAULT_INCIDENT_SCOPE = {
  incidentId: 'INC_PAINT_A_20260115_01',
  relatedEntityIds: ['ASSET_PAINT_ROBOT_07', 'ST_PAINT_BOOTH_03', 'SU_900001', 'ORD_10045', 'KPIOBS_2101'],
  eventTypePrefixes: ['maintenance', 'asset', 'inspection', 'quality', 'kpi'],
}

export const DEFAULT_CONTEXT_KERNEL = {
  plant: 'PLANT_DE_01',
  line: 'LINE_PAINT_A',
  time: '2026-01-15T06:00:00Z/2026-01-15T14:00:00Z',
  severity: Severity.CRITICAL,
  confidence: Trust.SUPPORTED,
  stage: 'issue-detection',
  focusEntity: 'KPIOBS_2101',
  hypothesis: 'Paint booth contamination increased rework and delayed outbound delivery.',
  incidentScope: DEFAULT_INCIDENT_SCOPE,
}

/**
 * Canonical query schema shared across all pages.
 * Only keys listed here are serialized when generating scoped links.
 */
export const CANONICAL_QUERY_KEYS = Object.freeze([
  'plant',
  'line',
  'time',
  'severity',
  'confidence',
  'stage',
  'focusEntity',
  'hypothesis',
  'incidentId',
  'incidentEntities',
  'incidentEventTypes',
  'mode',
  'domain',
  'event',
  'step',
  'selectedEntity',
  'selectedNode',
  'selectedPath',
  'anchor',
  'highlight',
  'correlatedOnly',
  'lineageArtifact',
  'sourceEvent',
  'relationshipClass',
  'eventClass',
  'anomaliesOnly',
  'source',
])

const LEGACY_QUERY_ALIASES = Object.freeze({
  incident: 'incidentId',
  focus: 'focusEntity',
  activeHypothesis: 'hypothesis',
})

function parseCsv(value, fallback = []) {
  if (!value) return fallback
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toScalarQueryValue(value) {
  if (value === undefined || value === null) return null
  if (Array.isArray(value)) return value.join(',')
  if (typeof value === 'object') return null
  if (typeof value === 'boolean') return String(value)
  return String(value)
}

function normalizeIncomingPatch(patch = {}) {
  const normalized = { ...patch }
  Object.entries(LEGACY_QUERY_ALIASES).forEach(([legacy, canonical]) => {
    if (normalized[canonical] === undefined && normalized[legacy] !== undefined) {
      normalized[canonical] = normalized[legacy]
    }
  })
  return normalized
}

export function readContextKernel(searchParams) {
  const focusEntity = searchParams.get('focusEntity') || searchParams.get('focus') || DEFAULT_CONTEXT_KERNEL.focusEntity
  const hypothesis = searchParams.get('hypothesis') || searchParams.get('activeHypothesis') || DEFAULT_CONTEXT_KERNEL.hypothesis

  const incidentScope = {
    incidentId: searchParams.get('incidentId') || searchParams.get('incident') || DEFAULT_CONTEXT_KERNEL.incidentScope.incidentId,
    relatedEntityIds: parseCsv(searchParams.get('incidentEntities'), DEFAULT_CONTEXT_KERNEL.incidentScope.relatedEntityIds),
    eventTypePrefixes: parseCsv(searchParams.get('incidentEventTypes'), DEFAULT_CONTEXT_KERNEL.incidentScope.eventTypePrefixes),
  }

  return {
    plant: searchParams.get('plant') || DEFAULT_CONTEXT_KERNEL.plant,
    line: searchParams.get('line') || DEFAULT_CONTEXT_KERNEL.line,
    time: searchParams.get('time') || DEFAULT_CONTEXT_KERNEL.time,
    severity: toApprovedSeverity(searchParams.get('severity') || DEFAULT_CONTEXT_KERNEL.severity, DEFAULT_CONTEXT_KERNEL.severity),
    confidence: toApprovedTrust(searchParams.get('confidence') || DEFAULT_CONTEXT_KERNEL.confidence, DEFAULT_CONTEXT_KERNEL.confidence),
    stage: searchParams.get('stage') || DEFAULT_CONTEXT_KERNEL.stage,
    focusEntity,
    hypothesis,
    incidentScope,
  }
}

export function toKernelQuery(kernel, patch = {}) {
  const normalizedPatch = normalizeIncomingPatch(patch)
  const merged = { ...kernel, ...normalizedPatch }
  const params = new URLSearchParams()

  params.set('plant', merged.plant || DEFAULT_CONTEXT_KERNEL.plant)
  params.set('line', merged.line || DEFAULT_CONTEXT_KERNEL.line)
  params.set('time', merged.time || DEFAULT_CONTEXT_KERNEL.time)
  params.set('severity', toApprovedSeverity(merged.severity || DEFAULT_CONTEXT_KERNEL.severity, DEFAULT_CONTEXT_KERNEL.severity))
  params.set('confidence', toApprovedTrust(merged.confidence || DEFAULT_CONTEXT_KERNEL.confidence, DEFAULT_CONTEXT_KERNEL.confidence))
  params.set('stage', merged.stage || DEFAULT_CONTEXT_KERNEL.stage)
  params.set('focusEntity', merged.focusEntity || DEFAULT_CONTEXT_KERNEL.focusEntity)
  params.set('hypothesis', merged.hypothesis || DEFAULT_CONTEXT_KERNEL.hypothesis)

  const scope = merged.incidentScope || DEFAULT_CONTEXT_KERNEL.incidentScope
  params.set('incidentId', scope.incidentId || DEFAULT_CONTEXT_KERNEL.incidentScope.incidentId)
  params.set('incidentEntities', (scope.relatedEntityIds || []).join(','))
  params.set('incidentEventTypes', (scope.eventTypePrefixes || []).join(','))

  CANONICAL_QUERY_KEYS.forEach((key) => {
    if (params.has(key)) return
    const scalarValue = toScalarQueryValue(normalizedPatch[key])
    if (scalarValue === null) return
    params.set(key, scalarValue)
  })

  return params
}

export function toScopedQuery(globalContext = {}, extra = {}) {
  const normalizedExtra = normalizeIncomingPatch(extra)
  const scopedSource = {
    ...globalContext,
    ...normalizedExtra,
  }

  if (scopedSource.incidentScope && typeof scopedSource.incidentScope === 'object') {
    scopedSource.incidentId = scopedSource.incidentScope.incidentId
    scopedSource.incidentEntities = (scopedSource.incidentScope.relatedEntityIds || []).join(',')
    scopedSource.incidentEventTypes = (scopedSource.incidentScope.eventTypePrefixes || []).join(',')
  }

  const params = new URLSearchParams()
  CANONICAL_QUERY_KEYS.forEach((key) => {
    const scalarValue = toScalarQueryValue(scopedSource[key])
    if (scalarValue === null) return
    params.set(key, scalarValue)
  })

  return params
}

const routeLabels = {
  executive: 'Executive',
  production: 'Production',
  quality: 'Quality',
  logistics: 'Logistics',
  maintenance: 'Maintenance',
  process: 'Process',
  events: 'Events',
  graph: 'Graph',
  'object-explorer': 'Object Explorer',
  lineage: 'Lineage',
  'impact-analysis': 'Impact Analysis',
}

const reasoningHints = {
  executive: 'Issue detection',
  production: 'Domain impact - production',
  quality: 'Domain impact - quality',
  logistics: 'Domain impact - logistics',
  maintenance: 'Domain impact - maintenance',
  process: 'Evidence in process flow',
  events: 'Evidence in timeline',
  graph: 'Root-cause and propagation',
  'object-explorer': 'Object-centric validation',
  lineage: 'Trust and provenance',
  'impact-analysis': 'Decision support',
}

export function buildSemanticBreadcrumbs(pathname, kernel) {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = [
    { label: 'Incident', hint: `${kernel.incidentScope.incidentId} · ${kernel.severity}`, to: '/executive' },
    { label: 'Impact', hint: `${kernel.plant} / ${kernel.line}`, to: '/impact-analysis' },
  ]

  let current = ''
  segments.forEach((segment, idx) => {
    current += `/${segment}`
    const isId = idx > 0 && /[_\d]/.test(segment)
    crumbs.push({
      label: isId ? `Entity ${decodeURIComponent(segment)}` : routeLabels[segment] || decodeURIComponent(segment),
      hint: isId ? 'focus node' : reasoningHints[segment] || 'analysis view',
      to: current,
    })
  })

  crumbs.push({ label: 'Decision', hint: kernel.hypothesis, to: '/impact-analysis' })
  return crumbs
}
