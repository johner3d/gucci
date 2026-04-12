import { ensureRecord, requireArray, requireString } from './validation'
import { validateProvenance } from './provenance'

export const semanticConceptContract = {
  contract: 'semantic_concept',
  version: 'v2',
  required: ['id', 'entityId', 'ontologyClassIds', 'semanticTags'],
}

export function validateSemanticConcept(concept, path = 'semanticConcept') {
  const diagnostics = []
  if (!ensureRecord(concept, path, diagnostics)) return diagnostics

  requireString(concept, path, 'id', diagnostics)
  requireString(concept, path, 'entityId', diagnostics)
  requireArray(concept, path, 'ontologyClassIds', diagnostics)
  requireArray(concept, path, 'semanticTags', diagnostics)

  if (concept.provenance) diagnostics.push(...validateProvenance(concept.provenance, `${path}.provenance`))
  return diagnostics
}
