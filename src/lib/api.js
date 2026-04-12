import { DataValidationError } from '../domain/schema'
import { loadSemanticWorkspace, validateUiSpaceModel } from '../domain/workspace/semanticWorkspace'

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

function withSpaceGuard(space, workspace, extraDiagnostics = []) {
  const diagnostics = [...workspace.diagnostics, ...validateUiSpaceModel(space, workspace), ...extraDiagnostics]
  assertDiagnostics(diagnostics, space)
  return diagnostics
}

export async function loadOverviewPageData() {
  const context = 'overview.pages'
  try {
    const [workspace, pages] = await Promise.all([loadSemanticWorkspace(), fetchJSON('/data/generated/v1/ui/pages.json')])
    const page = pages[0]
    if (!page) {
      throw new DataValidationError('Missing overview page', [{ path: context, code: 'empty', message: 'No pages returned', level: 'error' }])
    }
    const diagnostics = withSpaceGuard('overview', workspace)
    return { page, diagnostics }
  } catch (error) {
    throw new DataValidationError('Could not load overview page', asDiagnostics(error, context))
  }
}

export async function loadEventsData() {
  const context = 'events'
  try {
    const workspace = await loadSemanticWorkspace()
    const diagnostics = withSpaceGuard('events', workspace)

    return {
      events: workspace.contracts.events.map((entry) => entry.legacy),
      eventContracts: workspace.contracts.events,
      diagnostics,
    }
  } catch (error) {
    throw new DataValidationError('Could not load events', asDiagnostics(error, context))
  }
}

export async function loadGraphData() {
  const context = 'graph'
  try {
    const [workspace, graphUi] = await Promise.all([loadSemanticWorkspace(), fetchJSON('/data/generated/v1/ui/graph.json')])
    const diagnostics = withSpaceGuard('graph', workspace)

    return {
      graph: {
        ...graphUi,
        nodes: workspace.contracts.entities.map((entity) => ({ id: entity.id, type: entity.entityType, ...entity.legacy })),
        edges: workspace.contracts.relationships.map((relationship) => relationship.legacy),
      },
      relationships: workspace.contracts.relationships.map((entry) => entry.legacy),
      contracts: {
        entities: workspace.contracts.entities,
        relationships: workspace.contracts.relationships,
        causalLinks: workspace.contracts.causalLinks,
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
    const workspace = await loadSemanticWorkspace()
    const diagnostics = withSpaceGuard('objects', workspace)
    const entity = workspace.contracts.entities.find((candidate) => candidate.id === id)
    if (!entity) {
      throw new DataValidationError(`Could not find object card ${id}`, [{ path: context, code: 'not_found', message: 'Entity not found in workspace', level: 'error' }])
    }

    const card = await fetchJSON(`/data/generated/v1/ui/object_cards/${id}.json`)
    return {
      card,
      contracts: { entity },
      diagnostics,
    }
  } catch (error) {
    throw new DataValidationError(`Could not load object card ${id}`, asDiagnostics(error, context))
  }
}

export async function loadLineageArtifactsData() {
  const context = 'lineage.artifacts'
  try {
    const workspace = await loadSemanticWorkspace()
    const diagnostics = withSpaceGuard('lineage', workspace)

    return {
      artifacts: workspace.contracts.lineageArtifacts.map((entry) => entry.legacy),
      lineageContracts: workspace.contracts.lineageArtifacts,
      diagnostics,
    }
  } catch (error) {
    throw new DataValidationError('Could not load lineage artifacts', asDiagnostics(error, context))
  }
}

export async function loadEntityWorkspaceData() {
  const context = 'entity.workspace'
  try {
    const workspace = await loadSemanticWorkspace()
    const diagnostics = withSpaceGuard('objects', workspace)

    return {
      entities: workspace.contracts.entities.map((entry) => ({ ...entry.legacy, entity_type: entry.entityType, id: entry.id })),
      relationships: workspace.contracts.relationships.map((entry) => entry.legacy),
      events: workspace.contracts.events.map((entry) => entry.legacy),
      sourceRepresentations: workspace.resources.sourceRepresentations,
      results: workspace.resources.results,
      artifacts: workspace.contracts.lineageArtifacts.map((entry) => entry.legacy),
      semantics: Object.fromEntries(
        workspace.contracts.semanticConcepts.map((concept) => [
          concept.entityId,
          { ontology_class_ids: concept.ontologyClassIds, semantic_tags: concept.semanticTags },
        ])
      ),
      ontologyClasses: workspace.resources.semanticOntologyClasses,
      terms: workspace.resources.semanticTerms,
      taxonomyNodes: workspace.resources.semanticTaxonomyNodes,
      rules: workspace.resources.semanticRules,
      aliases: workspace.resources.semanticAliases,
      contracts: workspace.contracts,
      diagnostics,
    }
  } catch (error) {
    throw new DataValidationError('Could not load entity workspace data', asDiagnostics(error, context))
  }
}

export async function loadProcessData() {
  const context = 'process'
  try {
    const workspace = await loadSemanticWorkspace()
    const diagnostics = withSpaceGuard('process', workspace)

    return {
      canvas: workspace.resources.processCanvas,
      events: workspace.contracts.events.map((entry) => entry.legacy),
      relationships: workspace.contracts.relationships.map((entry) => entry.legacy),
      kpis: workspace.contracts.kpiObservations.map((entry) => entry.legacy),
      artifacts: workspace.contracts.lineageArtifacts.map((entry) => entry.legacy),
      contracts: {
        processNodes: workspace.contracts.processNodes,
        causalLinks: workspace.contracts.causalLinks,
      },
      diagnostics,
    }
  } catch (error) {
    throw new DataValidationError('Could not load process data', asDiagnostics(error, context))
  }
}

export function toUiDiagnostics(error, fallbackPath = 'data') {
  return asDiagnostics(error, fallbackPath)
}
