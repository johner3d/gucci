import { ensureRecord, requireString } from './validation'
import { validateProvenance } from './provenance'

export const kpiObservationContract = {
  contract: 'kpi_observation',
  version: 'v2',
  required: ['id', 'kpiName', 'status', 'value'],
}

export function validateKpiObservation(observation, path = 'kpiObservation') {
  const diagnostics = []
  if (!ensureRecord(observation, path, diagnostics)) return diagnostics

  requireString(observation, path, 'id', diagnostics)
  requireString(observation, path, 'kpiName', diagnostics)
  requireString(observation, path, 'status', diagnostics)

  if (observation.value === undefined || observation.value === null) {
    diagnostics.push({ path: `${path}.value`, code: 'invalid_type', message: 'Expected non-null value' })
  }

  if (observation.provenance) diagnostics.push(...validateProvenance(observation.provenance, `${path}.provenance`))
  return diagnostics
}
