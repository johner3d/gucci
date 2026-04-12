import { ensureRecord, requireString } from './validation'

export const PROVENANCE_CLASSES = [
  'source-native',
  'source-derivable',
  'synthetic source-realistic',
  'synthetic target-state',
]

/**
 * @typedef {Object} ProvenanceContractV2
 * @property {'provenance'} contract
 * @property {'v2'} version
 * @property {string} sourceSystem
 * @property {string} sourceRecordId
 * @property {string} ingestionVersion
 * @property {string=} provenanceClass
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
  if (provenance.provenanceClass && !PROVENANCE_CLASSES.includes(provenance.provenanceClass)) {
    diagnostics.push({
      path: `${path}.provenanceClass`,
      code: 'invalid_enum',
      message: `Expected one of: ${PROVENANCE_CLASSES.join(', ')}`,
    })
  }
  return diagnostics
}
