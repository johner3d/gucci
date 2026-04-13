const DEFAULT_INCIDENT_SCOPE = {
  incidentId: 'INC_PAINT_A_20260115_01',
  relatedEntityIds: ['ASSET_PAINT_ROBOT_07', 'ST_PAINT_BOOTH_03', 'SU_900001', 'ORD_10045', 'KPIOBS_2101'],
  eventTypePrefixes: ['maintenance', 'asset', 'inspection', 'quality', 'kpi'],
}

export const DEFAULT_CONTEXT_KERNEL = {
  plant: 'PLANT_DE_01',
  line: 'LINE_PAINT_A',
  time: '2026-01-15T06:00:00Z/2026-01-15T14:00:00Z',
  severity: 'high',
  confidence: 'supported',
  stage: 'issue-detection',
  evidenceAnchor: '',
  focusEntity: 'KPIOBS_2101',
  hypothesis: 'Paint booth contamination increased rework and delayed outbound delivery.',
  incidentScope: DEFAULT_INCIDENT_SCOPE,
}

function parseCsv(value, fallback = []) {
  if (!value) return fallback
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function readContextKernel(searchParams) {
  const incidentScope = {
    incidentId: searchParams.get('incidentId') || DEFAULT_CONTEXT_KERNEL.incidentScope.incidentId,
    relatedEntityIds: parseCsv(searchParams.get('incidentEntities'), DEFAULT_CONTEXT_KERNEL.incidentScope.relatedEntityIds),
    eventTypePrefixes: parseCsv(searchParams.get('incidentEventTypes'), DEFAULT_CONTEXT_KERNEL.incidentScope.eventTypePrefixes),
  }

  const focusEntity = searchParams.get('focusEntity') || searchParams.get('focus') || DEFAULT_CONTEXT_KERNEL.focusEntity
  const hypothesis = searchParams.get('hypothesis') || searchParams.get('activeHypothesis') || DEFAULT_CONTEXT_KERNEL.hypothesis

  return {
    plant: searchParams.get('plant') || DEFAULT_CONTEXT_KERNEL.plant,
    line: searchParams.get('line') || DEFAULT_CONTEXT_KERNEL.line,
    time: searchParams.get('time') || DEFAULT_CONTEXT_KERNEL.time,
    severity: searchParams.get('severity') || DEFAULT_CONTEXT_KERNEL.severity,
    confidence: searchParams.get('confidence') || DEFAULT_CONTEXT_KERNEL.confidence,
    stage: searchParams.get('stage') || DEFAULT_CONTEXT_KERNEL.stage,
    evidenceAnchor: searchParams.get('anchor') || DEFAULT_CONTEXT_KERNEL.evidenceAnchor,
    focusEntity,
    hypothesis,
    incidentScope,
  }
}

export function toKernelQuery(kernel, patch = {}) {
  const merged = { ...kernel, ...patch }
  const params = new URLSearchParams()

  params.set('plant', merged.plant)
  params.set('line', merged.line)
  params.set('time', merged.time)
  params.set('severity', merged.severity)
  params.set('confidence', merged.confidence || DEFAULT_CONTEXT_KERNEL.confidence)
  params.set('stage', merged.stage || DEFAULT_CONTEXT_KERNEL.stage)
  params.set('anchor', merged.evidenceAnchor || patch.anchor || '')
  params.set('focusEntity', merged.focusEntity)
  params.set('focus', merged.focusEntity)
  params.set('hypothesis', merged.hypothesis)
  params.set('activeHypothesis', merged.hypothesis)

  const scope = merged.incidentScope || DEFAULT_CONTEXT_KERNEL.incidentScope
  params.set('incidentId', scope.incidentId)
  params.set('incidentEntities', (scope.relatedEntityIds || []).join(','))
  params.set('incidentEventTypes', (scope.eventTypePrefixes || []).join(','))

  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (key === 'incidentScope') return
    params.set(key, String(value))
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
