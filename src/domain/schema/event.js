import { ensureRecord, requireString } from './validation'
import { validateProvenance } from './provenance'

/**
 * @typedef {Object} EventContractV2
 * @property {'event'} contract
 * @property {'v2'} version
 * @property {string} id
 * @property {string} eventType
 * @property {string} occurredAtUtc
 * @property {string[]} relatedEntityIds
 * @property {import('./provenance').ProvenanceContractV2=} provenance
 */

export const eventContract = {
  contract: 'event',
  version: 'v2',
  required: ['id', 'eventType', 'occurredAtUtc', 'relatedEntityIds'],
}

export function validateEvent(event, path = 'event') {
  const diagnostics = []
  if (!ensureRecord(event, path, diagnostics)) return diagnostics

  requireString(event, path, 'id', diagnostics)
  requireString(event, path, 'eventType', diagnostics)
  requireString(event, path, 'occurredAtUtc', diagnostics)

  if (!Array.isArray(event.relatedEntityIds)) {
    diagnostics.push({ path: `${path}.relatedEntityIds`, code: 'invalid_type', message: 'Expected array' })
  }

  if (event.provenance) diagnostics.push(...validateProvenance(event.provenance, `${path}.provenance`))

  return diagnostics
}
