import { ensureRecord, issue, requireString } from './validation'
import { validateProvenance } from './provenance'

/**
 * @typedef {Object} EntityContractV2
 * @property {'entity'} contract
 * @property {'v2'} version
 * @property {string} id
 * @property {string} entityType
 * @property {Object.<string, unknown>} attributes
 * @property {import('./provenance').ProvenanceContractV2=} provenance
 */

export const entityContract = {
  contract: 'entity',
  version: 'v2',
  required: ['id', 'entityType', 'attributes'],
}

export function validateEntity(entity, path = 'entity') {
  const diagnostics = []
  if (!ensureRecord(entity, path, diagnostics)) return diagnostics

  requireString(entity, path, 'id', diagnostics)
  requireString(entity, path, 'entityType', diagnostics)
  if (!ensureRecord(entity.attributes, `${path}.attributes`, diagnostics)) {
    diagnostics.push(issue(`${path}.attributes`, 'invalid_type', 'Entity attributes must be object'))
  }
  if (entity.provenance) diagnostics.push(...validateProvenance(entity.provenance, `${path}.provenance`))

  return diagnostics
}
