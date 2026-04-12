# PoC v1 Semantic Core (Locked for Step 1)

## Mandatory modeling distinctions

1. **Canonical entity vs source representation**
   - Canonical entities are normalized business objects.
   - Source representations preserve source-specific IDs and records.
2. **Object vs event**
   - Objects persist over time.
   - Events occur at a timestamp (or short interval).
3. **Object vs state**
   - State is an attribute/snapshot of an object, not the object itself.
4. **Event vs result**
   - Event (`inspection_executed`) is distinct from result (`defect_detected`).
5. **Business relationship vs technical lineage relationship**
   - Business links describe manufacturing reality.
   - Technical lineage links describe derivation/provenance.

## In-scope object types

- Plant, Line, Station, Asset
- Product, Variant, ProductionOrder, SerialUnit, BatchLot
- Inspection, Defect, MaintenanceActivity
- Event
- KPIDefinition, KPIObservation
- CanonicalEntity, SourceRepresentation, LineageArtifact

## Minimal event types

- maintenance_overdue_threshold_crossed
- maintenance_performed
- asset_disturbance_started
- asset_disturbance_cleared
- unit_processed
- inspection_executed
- defect_detected
- kpi_threshold_violated

## Minimal KPI definitions

- Defect Rate
- First Pass Yield
- Disturbance Duration
- Order Delay Risk

## Deterministic seed constraints

- Seed name: `poc_v1_baseline`
- Seed mode: `source_realistic`
- Plant scope: `PLANT_DE_01`
- Main disturbed asset: `ASSET_PAINT_ROBOT_07`
- Deterministic timestamps and IDs (no randomness in committed seed)

