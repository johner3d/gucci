import { adaptV1Event, adaptV1GraphEdge, adaptV1LineageArtifact } from '../domain/schema/adapters/v1'
import { DataValidationError, validateEntity } from '../domain/schema'

const jsonHeaders = { Accept: 'application/json' }

async function fetchJSON(path) {
  const response = await fetch(path, { headers: jsonHeaders })
  if (!response.ok) {
    throw new Error(`Could not load ${path}`)
  }
  return response.json()
}

function assertDiagnostics(diagnostics, context) {
  if (diagnostics.some((item) => item.level !== 'warning')) {
    throw new DataValidationError(`Validation failed for ${context}`, diagnostics)
  }
}

function asDiagnostics(error, context) {
  if (error instanceof DataValidationError) return error.diagnostics
  return [{ path: context, code: 'load_error', message: error.message, level: 'error' }]
}

export async function loadOverviewPageData() {
  const context = 'overview.pages'
  try {
    const pages = await fetchJSON('/data/generated/v1/ui/pages.json')
    const page = pages[0]
    if (!page) throw new DataValidationError('Missing overview page', [{ path: context, code: 'empty', message: 'No pages returned', level: 'error' }])
    return { page, diagnostics: [] }
  } catch (error) {
    throw new DataValidationError('Could not load overview page', asDiagnostics(error, context))
  }
}

export async function loadEventsData() {
  const context = 'events'
  try {
    const events = await fetchJSON('/data/generated/v1/canonical/events.json')
    const adapted = events.map(adaptV1Event)
    const diagnostics = adapted.flatMap((entry) => entry.diagnostics)
    assertDiagnostics(diagnostics, context)

    return {
      events: adapted.map((entry) => entry.adapted.legacy),
      eventContracts: adapted.map((entry) => entry.adapted),
      diagnostics,
    }
  } catch (error) {
    throw new DataValidationError('Could not load events', asDiagnostics(error, context))
  }
}

export async function loadGraphData() {
  const context = 'graph'
  try {
    const graph = await fetchJSON('/data/generated/v1/ui/graph.json')
    const edgeContracts = graph.edges.map(adaptV1GraphEdge)
    const edgeDiagnostics = edgeContracts.flatMap((entry) => entry.diagnostics)

    const nodeDiagnostics = []
    const nodeContracts = graph.nodes.map((node) => {
      const contract = {
        id: node.id,
        entityType: node.type || 'Unknown',
        attributes: node,
      }
      nodeDiagnostics.push(...validateEntity(contract, `graph.nodes.${node.id}`))
      return contract
    })

    const diagnostics = [...edgeDiagnostics, ...nodeDiagnostics]
    assertDiagnostics(diagnostics, context)

    return {
      graph,
      contracts: {
        entities: nodeContracts,
        relationships: edgeContracts.map((entry) => entry.adapted),
      },
      diagnostics,
    }
  } catch (error) {
    throw new DataValidationError('Could not load graph', asDiagnostics(error, context))
  }
}

export async function loadObjectCardData(id) {
  const context = `object_card.${id}`
  try {
    const card = await fetchJSON(`/data/generated/v1/ui/object_cards/${id}.json`)
    const entityContract = {
      id: card.object_id,
      entityType: card?.canonical_identity?.type,
      attributes: card,
    }
    const diagnostics = validateEntity(entityContract, context)
    assertDiagnostics(diagnostics, context)

    return {
      card,
      contracts: { entity: entityContract },
      diagnostics,
    }
  } catch (error) {
    throw new DataValidationError(`Could not load object card ${id}`, asDiagnostics(error, context))
  }
}

export async function loadLineageArtifactsData() {
  const context = 'lineage.artifacts'
  try {
    const artifacts = await fetchJSON('/data/generated/v1/lineage/artifacts.json')
    const adapted = artifacts.map(adaptV1LineageArtifact)
    const diagnostics = adapted.flatMap((entry) => entry.diagnostics)
    assertDiagnostics(diagnostics, context)

    return {
      artifacts: adapted.map((entry) => entry.adapted.legacy),
      lineageContracts: adapted.map((entry) => entry.adapted),
      diagnostics,
    }
  } catch (error) {
    throw new DataValidationError('Could not load lineage artifacts', asDiagnostics(error, context))
  }
}

export function toUiDiagnostics(error, fallbackPath = 'data') {
  return asDiagnostics(error, fallbackPath)
}
