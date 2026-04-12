import { ensureRecord, requireString } from './validation'
import { validateProvenance } from './provenance'

/**
 * @typedef {Object} RelationshipContractV2
 * @property {'relationship'} contract
 * @property {'v2'} version
 * @property {string} id
 * @property {string} sourceEntityId
 * @property {string} targetEntityId
 * @property {string} relationshipType
 * @property {'business'|'technical_lineage'} relationshipClass
 * @property {import('./provenance').ProvenanceContractV2=} provenance
 */

export const relationshipContract = {
  contract: 'relationship',
  version: 'v2',
  required: ['id', 'sourceEntityId', 'targetEntityId', 'relationshipType', 'relationshipClass'],
}

export function validateRelationship(relationship, path = 'relationship') {
  const diagnostics = []
  if (!ensureRecord(relationship, path, diagnostics)) return diagnostics

  requireString(relationship, path, 'id', diagnostics)
  requireString(relationship, path, 'sourceEntityId', diagnostics)
  requireString(relationship, path, 'targetEntityId', diagnostics)
  requireString(relationship, path, 'relationshipType', diagnostics)
  requireString(relationship, path, 'relationshipClass', diagnostics)
  if (relationship.provenance) diagnostics.push(...validateProvenance(relationship.provenance, `${path}.provenance`))

  return diagnostics
}
