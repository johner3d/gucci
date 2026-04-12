import { ensureRecord, requireArray, requireString } from './validation'
import { validateProvenance } from './provenance'

/**
 * @typedef {Object} LineageContractV2
 * @property {'lineage'} contract
 * @property {'v2'} version
 * @property {string} id
 * @property {string} artifactType
 * @property {string[]} upstreamArtifactIds
 * @property {string[]} downstreamArtifactIds
 * @property {import('./provenance').ProvenanceContractV2=} provenance
 */

export const lineageContract = {
  contract: 'lineage',
  version: 'v2',
  required: ['id', 'artifactType', 'upstreamArtifactIds', 'downstreamArtifactIds'],
}

export function validateLineageArtifact(artifact, path = 'lineageArtifact') {
  const diagnostics = []
  if (!ensureRecord(artifact, path, diagnostics)) return diagnostics

  requireString(artifact, path, 'id', diagnostics)
  requireString(artifact, path, 'artifactType', diagnostics)
  requireArray(artifact, path, 'upstreamArtifactIds', diagnostics)
  requireArray(artifact, path, 'downstreamArtifactIds', diagnostics)

  if (artifact.provenance) diagnostics.push(...validateProvenance(artifact.provenance, `${path}.provenance`))

  return diagnostics
}
