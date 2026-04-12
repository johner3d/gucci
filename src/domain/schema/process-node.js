import { ensureRecord, issue, requireArray, requireString } from './validation'
import { validateProvenance } from './provenance'

export const processNodeContract = {
  contract: 'process_node',
  version: 'v2',
  required: ['id', 'nodeType', 'label', 'laneId', 'relatedEntityIds'],
}

export function validateProcessNode(node, path = 'processNode') {
  const diagnostics = []
  if (!ensureRecord(node, path, diagnostics)) return diagnostics

  requireString(node, path, 'id', diagnostics)
  requireString(node, path, 'nodeType', diagnostics)
  requireString(node, path, 'label', diagnostics)
  requireString(node, path, 'laneId', diagnostics)
  requireArray(node, path, 'relatedEntityIds', diagnostics)
  if (!ensureRecord(node.state, `${path}.state`, diagnostics)) {
    diagnostics.push(issue(`${path}.state`, 'invalid_type', 'Expected state object'))
  }

  if (node.provenance) diagnostics.push(...validateProvenance(node.provenance, `${path}.provenance`))

  return diagnostics
}
