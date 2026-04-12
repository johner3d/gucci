import { validateEvent, validateLineageArtifact, validateRelationship } from '../index'

export function adaptV1Event(event) {
  const relatedEntityIds = ['asset_id', 'station_id', 'serial_unit_id', 'inspection_id', 'maintenance_activity_id']
    .map((field) => event[field])
    .filter(Boolean)

  const adapted = {
    id: event.id,
    eventType: event.type,
    occurredAtUtc: event.occurred_at_utc,
    relatedEntityIds,
    provenance: {
      sourceSystem: 'poc_v1',
      sourceRecordId: event.id,
      ingestionVersion: 'v1',
      provenanceClass: event.provenance_class || 'synthetic source-realistic',
    },
    legacy: event,
  }

  return { adapted, diagnostics: validateEvent(adapted, `events.${event.id}`) }
}

export function adaptV1LineageArtifact(artifact) {
  const adapted = {
    id: artifact.id,
    artifactType: artifact.artifact_type,
    upstreamArtifactIds: artifact.upstream_artifact_ids || [],
    downstreamArtifactIds: artifact.downstream_artifact_ids || [],
    provenance: {
      sourceSystem: 'poc_v1',
      sourceRecordId: artifact.id,
      ingestionVersion: artifact.version || 'v1',
      provenanceClass: artifact.provenance_class || 'source-derivable',
    },
    legacy: artifact,
  }

  return { adapted, diagnostics: validateLineageArtifact(adapted, `artifacts.${artifact.id}`) }
}

export function adaptV1GraphEdge(edge) {
  const adapted = {
    id: edge.id,
    sourceEntityId: edge.source_id || edge.source,
    targetEntityId: edge.target_id || edge.target,
    relationshipType: edge.type || edge.relationship,
    relationshipClass:
      edge.relationship_class ||
      (edge.category && ['lineage', 'semantic'].includes(edge.category) ? 'technical_lineage' : 'business'),
    relationshipCategory: edge.category || edge.relationship_category,
    qualifiers: edge.qualifiers || {},
    provenance: {
      sourceSystem: edge.provenance?.source_system || 'poc_v1',
      sourceRecordId: edge.id,
      ingestionVersion: edge.provenance?.ingestion_version || 'v1',
      provenanceClass: edge.provenance_class || 'source-derivable',
    },
    legacy: edge,
  }

  return { adapted, diagnostics: validateRelationship(adapted, `graph.edges.${edge.id}`) }
}

export function adaptV1Entity(id, entityType, attributes = {}) {
  return {
    id,
    entityType,
    attributes,
    provenance: {
      sourceSystem: attributes.provenance?.source_system || 'poc_v1',
      sourceRecordId: id,
      ingestionVersion: attributes.provenance?.ingestion_version || 'v1',
      provenanceClass: attributes.provenance_class || 'synthetic source-realistic',
    },
    legacy: attributes,
  }
}
