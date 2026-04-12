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
    },
    legacy: artifact,
  }

  return { adapted, diagnostics: validateLineageArtifact(adapted, `artifacts.${artifact.id}`) }
}

export function adaptV1GraphEdge(edge) {
  const adapted = {
    id: edge.id,
    sourceEntityId: edge.source,
    targetEntityId: edge.target,
    relationshipType: edge.relationship,
    relationshipClass: edge.relationship_class,
    legacy: edge,
  }

  return { adapted, diagnostics: validateRelationship(adapted, `graph.edges.${edge.id}`) }
}

export function adaptV1Entity(id, entityType, attributes = {}) {
  return {
    id,
    entityType,
    attributes,
    legacy: attributes,
  }
}
