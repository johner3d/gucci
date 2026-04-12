# Automotive Manufacturing Intelligence PoC

This repository contains a deterministic proof-of-concept for a graph-native automotive manufacturing intelligence showcase.

## Current implementation status (PoC baseline)

- ✅ Semantic core contract documented.
- ✅ Deterministic seed scenario committed.
- ✅ Source-like and canonical data explicitly separated.
- ✅ Lineage artifacts included for KPI/UI insight paths.
- ✅ Minimal React application available for overview/graph/object/lineage navigation.

## Seed scenario (v1)

Backbone chain represented in the deterministic dataset:

`maintenance overdue -> asset disturbance -> defect spike -> affected serial units/orders -> KPI impact`

## Repository structure

- `src/`
  - PoC React UI.
- `scripts/`
  - Deterministic artifact generator.
- `data/seed/v1/`
  - Source-like synthetic inputs and seed configuration.
- `data/generated/v1/`
  - Generated canonical, lineage, KPI, and UI payloads.
- `docs/poc-v1/`
  - Semantic core and PoC-level reference docs.
- `documentation/`
  - Product documentation and overhaul plans for next implementation stages.

## Data folders

- `data/seed/v1/source_realistic`: source-like synthetic records
- `data/seed/v1/canonical`: normalized entities, events, and facts
- `data/seed/v1/lineage`: explicit provenance and derivation artifacts
- `data/seed/v1/config`: deterministic seed metadata

## Build generated artifacts

Run the deterministic generator:

```bash
python scripts/build_poc_v1.py
```

## Run the UI

```bash
npm install
npm run dev
```

## Forward plan documentation

See:

- `documentation/project-documentation-index.md`
- `documentation/ux-ui-overhaul-master-plan.md`

These docs define the complete product/UX/UI/IA overhaul strategy and phased implementation sequence.
