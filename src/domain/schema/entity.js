import { ensureRecord, issue, requireString } from './validation'

/**
 * @typedef {Object} EntityContractV2
 * @property {'entity'} contract
 * @property {'v2'} version
 * @property {string} id
 * @property {string} entityType
 * @property {Object.<string, unknown>} attributes
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

  return diagnostics
}
