import { ensureRecord, requireString } from './validation'

/**
 * @typedef {Object} ProvenanceContractV2
 * @property {'provenance'} contract
 * @property {'v2'} version
 * @property {string} sourceSystem
 * @property {string} sourceRecordId
 * @property {string} ingestionVersion
 */

export const provenanceContract = {
  contract: 'provenance',
  version: 'v2',
  required: ['sourceSystem', 'sourceRecordId', 'ingestionVersion'],
}

export function validateProvenance(provenance, path = 'provenance') {
  const diagnostics = []
  if (!ensureRecord(provenance, path, diagnostics)) return diagnostics
  requireString(provenance, path, 'sourceSystem', diagnostics)
  requireString(provenance, path, 'sourceRecordId', diagnostics)
  requireString(provenance, path, 'ingestionVersion', diagnostics)
  return diagnostics
}
