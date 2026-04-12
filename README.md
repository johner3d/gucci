# Automotive Manufacturing Intelligence PoC

This repository starts with **Step 1** of the PoC plan: lock the semantic core and commit a deterministic seed dataset.

## Current status

- ✅ Semantic core contract documented.
- ✅ Deterministic seed scenario committed.
- ✅ Source-like and canonical data are explicitly separated.
- ✅ Lineage artifacts are included for one KPI/UI insight path.

## Seed scenario (v1)

Backbone chain represented in the seed:

`maintenance overdue -> asset disturbance -> defect spike -> affected serial units/orders -> KPI impact`

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
