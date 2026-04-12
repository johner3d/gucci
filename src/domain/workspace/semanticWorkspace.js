import {
  DataValidationError,
  validateCausalLink,
  validateEntity,
  validateEvent,
  validateKpiObservation,
  validateLineageArtifact,
  validateProcessNode,
  validateRelationship,
  validateSemanticConcept,
} from '../schema'
import { adaptV1Entity, adaptV1Event, adaptV1GraphEdge, adaptV1LineageArtifact } from '../schema/adapters/v1'

const jsonHeaders = { Accept: 'application/json' }

const sourcePaths = {
  canonicalEntities: '/data/generated/v1/canonical/entities.json',
  canonicalRelationships: '/data/generated/v1/canonical/relationships.json',
  canonicalEvents: '/data/generated/v1/canonical/events.json',
  sourceRepresentations: '/data/generated/v1/canonical/source_representations.json',
  canonicalResults: '/data/generated/v1/canonical/results.json',
  lineageArtifacts: '/data/generated/v1/lineage/artifacts.json',
  semanticEntityMap: '/data/generated/v1/semantic/entity_semantics.json',
  semanticOntologyClasses: '/data/generated/v1/semantic/ontology_classes.json',
  semanticTerms: '/data/generated/v1/semantic/terms.json',
  semanticTaxonomyNodes: '/data/generated/v1/semantic/taxonomy_nodes.json',
  semanticRules: '/data/generated/v1/semantic/rules.json',
  semanticAliases: '/data/generated/v1/semantic/aliases.json',
  kpiObservations: '/data/generated/v1/kpi/observations.json',
  processCanvas: '/data/generated/v1/ui/process_canvas.json',
}

async function fetchJSON(path) {
  const response = await fetch(path, { headers: jsonHeaders })
  if (!response.ok) throw new Error(`Could not load ${path}`)
  return response.json()
}

function flattenEntityStore(entities) {
  return Object.entries(entities || {}).flatMap(([entityType, records]) =>
    (records || []).map((record) => ({ ...record, entity_type: entityType }))
  )
}

function toProvenance({ id, sourceSystem = 'poc_v1', ingestionVersion = 'v1', provenanceClass = 'synthetic target-state' }) {
  return {
    sourceSystem,
    sourceRecordId: id,
    ingestionVersion,
    provenanceClass,
  }
}

function materializeContracts(raw) {
  const diagnostics = []

  const entities = flattenEntityStore(raw.canonicalEntities).map((entity) => {
    const adapted = adaptV1Entity(entity.id, entity.entity_type, entity)
    diagnostics.push(...validateEntity(adapted, `workspace.entities.${adapted.id}`))
    return adapted
  })

  const relationships = raw.canonicalRelationships.map((edge) => {
    const adapted = adaptV1GraphEdge(edge).adapted
    diagnostics.push(...validateRelationship(adapted, `workspace.relationships.${adapted.id}`))
    return adapted
  })

  const events = raw.canonicalEvents.map((event) => {
    const adapted = adaptV1Event(event).adapted
    diagnostics.push(...validateEvent(adapted, `workspace.events.${adapted.id}`))
    return adapted
  })

  const kpiObservations = raw.kpiObservations.map((observation) => {
    const adapted = {
      id: observation.id,
      kpiName: observation.kpi,
      status: observation.status,
      value: observation.value,
      threshold: observation.threshold,
      windowStartUtc: observation.window_start_utc,
      windowEndUtc: observation.window_end_utc,
      scopedEntityIds: [observation.asset_id, observation.line_id, observation.order_id].filter(Boolean),
      legacy: observation,
      provenance: toProvenance({ id: observation.id, provenanceClass: 'source-derivable' }),
    }
    diagnostics.push(...validateKpiObservation(adapted, `workspace.kpiObservations.${adapted.id}`))
    return adapted
  })

  const lineageArtifacts = raw.lineageArtifacts.map((artifact) => {
    const adapted = adaptV1LineageArtifact(artifact).adapted
    diagnostics.push(...validateLineageArtifact(adapted, `workspace.lineageArtifacts.${adapted.id}`))
    return adapted
  })

  const semanticConcepts = Object.entries(raw.semanticEntityMap || {}).map(([entityId, semanticEntry]) => {
    const ontologyClassIds = semanticEntry.ontology_class_ids || []
    const termIds = raw.semanticTerms.filter((term) => ontologyClassIds.includes(term.class_id)).map((term) => term.id)
    const concept = {
      id: `SEM_${entityId}`,
      entityId,
      ontologyClassIds,
      semanticTags: semanticEntry.semantic_tags || [],
      termIds,
      taxonomyNodeIds: raw.semanticOntologyClasses
        .filter((entry) => ontologyClassIds.includes(entry.id))
        .flatMap((entry) => entry.taxonomy_node_ids || []),
      linkedRuleIds: raw.semanticRules.filter((rule) => (rule.linked_entity_ids || []).includes(entityId)).map((rule) => rule.id),
      aliases: raw.semanticAliases.filter((alias) => termIds.includes(alias.term_id)).map((alias) => alias.alias),
      provenance: toProvenance({ id: entityId }),
    }
    diagnostics.push(...validateSemanticConcept(concept, `workspace.semanticConcepts.${concept.id}`))
    return concept
  })

  const processNodes = (raw.processCanvas.steps || []).map((step) => {
    const node = {
      id: step.id,
      nodeType: step.type,
      label: step.name,
      laneId: step.lane_id,
      sequence: step.sequence,
      state: {
        value: step.state,
        transition: step.state_transition,
        risk: step.risk,
      },
      relatedEntityIds: step.related?.impacted_entities || [],
      relatedEventIds: step.related?.events || [],
      relatedCausalLinkIds: step.related?.causal_links || [],
      relatedKpiObservationIds: step.related?.kpis || [],
      relatedLineageArtifactIds: step.related?.lineage_evidence || [],
      provenance: toProvenance({ id: step.id }),
      legacy: step,
    }
    diagnostics.push(...validateProcessNode(node, `workspace.processNodes.${node.id}`))
    return node
  })

  const causalLinks = relationships
    .filter((relationship) => relationship.relationshipCategory === 'causal' || ['impacts', 'influences', 'causes'].includes(relationship.relationshipType))
    .map((relationship) => {
      const link = {
        id: relationship.id,
        sourceEntityId: relationship.sourceEntityId,
        targetEntityId: relationship.targetEntityId,
        causalType: relationship.relationshipType,
        confidence: relationship.qualifiers?.confidence,
        strength: relationship.qualifiers?.strength,
        evidenceRefs: relationship.qualifiers?.evidence_refs || [],
        provenance: relationship.provenance,
        legacy: relationship.legacy,
      }
      diagnostics.push(...validateCausalLink(link, `workspace.causalLinks.${link.id}`))
      return link
    })

  const nodes = [
    ...entities.map((entry) => ({ id: entry.id, kind: 'entity', ref: entry.id })),
    ...kpiObservations.map((entry) => ({ id: entry.id, kind: 'kpi_observation', ref: entry.id })),
    ...lineageArtifacts.map((entry) => ({ id: entry.id, kind: 'lineage_artifact', ref: entry.id })),
    ...processNodes.map((entry) => ({ id: entry.id, kind: 'process_node', ref: entry.id })),
    ...semanticConcepts.map((entry) => ({ id: entry.id, kind: 'semantic_concept', ref: entry.id })),
  ]

  return {
    graph: {
      nodes,
      relationships: relationships.map((entry) => ({
        id: entry.id,
        sourceId: entry.sourceEntityId,
        targetId: entry.targetEntityId,
        relationshipType: entry.relationshipType,
        relationshipClass: entry.relationshipClass,
        relationshipCategory: entry.relationshipCategory,
      })),
      causalLinks: causalLinks.map((entry) => ({ id: entry.id, sourceId: entry.sourceEntityId, targetId: entry.targetEntityId, causalType: entry.causalType })),
    },
    contracts: {
      entities,
      relationships,
      events,
      processNodes,
      causalLinks,
      kpiObservations,
      lineageArtifacts,
      semanticConcepts,
    },
    resources: {
      sourceRepresentations: raw.sourceRepresentations,
      results: raw.canonicalResults,
      semanticOntologyClasses: raw.semanticOntologyClasses,
      semanticTerms: raw.semanticTerms,
      semanticTaxonomyNodes: raw.semanticTaxonomyNodes,
      semanticRules: raw.semanticRules,
      semanticAliases: raw.semanticAliases,
      processCanvas: raw.processCanvas,
    },
    diagnostics,
  }
}

const UI_SPACE_CONTRACTS = {
  overview: ['entities', 'events', 'kpiObservations'],
  events: ['events', 'lineageArtifacts', 'processNodes'],
  graph: ['entities', 'relationships', 'causalLinks'],
  objects: ['entities', 'relationships', 'events', 'semanticConcepts'],
  objectSearch: ['entities', 'relationships'],
  lineage: ['lineageArtifacts'],
  process: ['processNodes', 'events', 'causalLinks', 'kpiObservations', 'lineageArtifacts'],
}

export function validateUiSpaceModel(space, workspace) {
  const required = UI_SPACE_CONTRACTS[space] || []
  const diagnostics = []

  required.forEach((contractKey) => {
    const list = workspace?.contracts?.[contractKey]
    if (!Array.isArray(list) || !list.length) {
      diagnostics.push({
        path: `workspace.contracts.${contractKey}`,
        code: 'missing_contract_collection',
        message: `UI space "${space}" requires populated ${contractKey} contracts`,
        level: 'error',
      })
    }
  })

  return diagnostics
}

export async function loadSemanticWorkspace() {
  const raw = {}
  await Promise.all(
    Object.entries(sourcePaths).map(async ([key, path]) => {
      raw[key] = await fetchJSON(path)
    })
  )

  const workspace = materializeContracts(raw)
  const errors = workspace.diagnostics.filter((entry) => entry.level !== 'warning')
  if (errors.length) {
    throw new DataValidationError('Semantic workspace contract validation failed', errors)
  }

  return workspace
}
