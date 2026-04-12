import { ensureRecord, requireString } from './validation'
import { validateProvenance } from './provenance'

export const causalLinkContract = {
  contract: 'causal_link',
  version: 'v2',
  required: ['id', 'sourceEntityId', 'targetEntityId', 'causalType'],
}

export function validateCausalLink(link, path = 'causalLink') {
  const diagnostics = []
  if (!ensureRecord(link, path, diagnostics)) return diagnostics

  requireString(link, path, 'id', diagnostics)
  requireString(link, path, 'sourceEntityId', diagnostics)
  requireString(link, path, 'targetEntityId', diagnostics)
  requireString(link, path, 'causalType', diagnostics)

  if (link.provenance) diagnostics.push(...validateProvenance(link.provenance, `${path}.provenance`))
  return diagnostics
}
