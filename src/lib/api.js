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

function flattenEntityStore(entities) {
  return Object.entries(entities || {}).flatMap(([entityType, records]) =>
    (records || []).map((record) => ({ ...record, entity_type: entityType }))
  )
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
    const [graph, relationshipStore] = await Promise.all([
      fetchJSON('/data/generated/v1/ui/graph.json'),
      fetchJSON('/data/generated/v1/canonical/relationships.json'),
    ])
    const edgeContracts = relationshipStore.map(adaptV1GraphEdge)
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
      relationships: relationshipStore,
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

export async function loadEntityWorkspaceData() {
  const context = 'entity.workspace'
  try {
    const [entities, relationships, events, sourceRepresentations, results, artifacts, semantics, ontologyClasses, terms, taxonomyNodes, rules, aliases] = await Promise.all([
      fetchJSON('/data/generated/v1/canonical/entities.json'),
      fetchJSON('/data/generated/v1/canonical/relationships.json'),
      fetchJSON('/data/generated/v1/canonical/events.json'),
      fetchJSON('/data/generated/v1/canonical/source_representations.json'),
      fetchJSON('/data/generated/v1/canonical/results.json'),
      fetchJSON('/data/generated/v1/lineage/artifacts.json'),
      fetchJSON('/data/generated/v1/semantic/entity_semantics.json'),
      fetchJSON('/data/generated/v1/semantic/ontology_classes.json'),
      fetchJSON('/data/generated/v1/semantic/terms.json'),
      fetchJSON('/data/generated/v1/semantic/taxonomy_nodes.json'),
      fetchJSON('/data/generated/v1/semantic/rules.json'),
      fetchJSON('/data/generated/v1/semantic/aliases.json'),
    ])

    return {
      entities: flattenEntityStore(entities),
      relationships,
      events,
      sourceRepresentations,
      results,
      artifacts,
      semantics,
      ontologyClasses,
      terms,
      taxonomyNodes,
      rules,
      aliases,
      diagnostics: [],
    }
  } catch (error) {
    throw new DataValidationError('Could not load entity workspace data', asDiagnostics(error, context))
  }
}

export async function loadProcessData() {
  const context = 'process'
  try {
    const [canvas, events, relationships, kpis, artifacts] = await Promise.all([
      fetchJSON('/data/generated/v1/ui/process_canvas.json'),
      fetchJSON('/data/generated/v1/canonical/events.json'),
      fetchJSON('/data/generated/v1/canonical/relationships.json'),
      fetchJSON('/data/generated/v1/kpi/observations.json'),
      fetchJSON('/data/generated/v1/lineage/artifacts.json'),
    ])

    return {
      canvas,
      events,
      relationships,
      kpis,
      artifacts,
      diagnostics: [],
    }
  } catch (error) {
    throw new DataValidationError('Could not load process data', asDiagnostics(error, context))
  }
}

export function toUiDiagnostics(error, fallbackPath = 'data') {
  return asDiagnostics(error, fallbackPath)
}
