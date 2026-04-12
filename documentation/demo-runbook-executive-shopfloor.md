# Demo Runbook — Executive and Shopfloor Walkthroughs

## Purpose
This runbook operationalizes showcase delivery with deterministic scripted journeys, QA gates, and success criteria for both executive and shopfloor audiences.

## Audience modes
- **Executive mode:** business impact, risk posture, decision confidence, ownership clarity.
- **Shopfloor mode:** anomaly confirmation speed, handoff clarity, actionability at line/asset/unit level.

## Preconditions
- Seed artifacts generated from deterministic scenario (`python scripts/build_poc_v1.py`).
- Demo host launched and reachable (`npm run dev`).
- Data reset to v1 deterministic baseline before each run.
- Presenter has one “analyst” and one “reviewer” role script prepared.

## Scripted journeys with deep links and success criteria

### Journey 1 — Defect spike triage
- **Open:** `/executive?plant=PLANT_01&line=LINE_PAINT_1&incident=INC_DEFECT_SPIKE_001&severity=elevated`
- **Expected walkthrough result:**
  - Root-cause candidates identified quickly.
  - Evidence chain crosses Overview → Graph → Events → Lineage.
  - Recommended mitigation and owner are stated.
- **Success criteria:**
  - Triage conclusion in ≤ 3 minutes.
  - Trust state explicitly called out before recommendation.

### Journey 2 — Order risk impact
- **Open:** `/logistics?plant=PLANT_01&order=ORD_10045&incident=INC_ORDER_RISK_002&severity=watch`
- **Expected walkthrough result:**
  - Affected orders/units and delay scope are quantified.
  - Process bottleneck and mitigation path are identified.
- **Success criteria:**
  - One cross-domain dependency explained.
  - One prioritized mitigation with expected timeline.

### Journey 3 — Asset disturbance propagation
- **Open:** `/maintenance?plant=PLANT_01&asset=ASSET_PAINT_ROBOT_07&incident=INC_ASSET_DISTURBANCE_003&severity=critical`
- **Expected walkthrough result:**
  - Causal path from maintenance issue to quality/KPI impact is demonstrated.
  - Affected serial unit (`SU_900001`) is inspected with lineage support.
- **Success criteria:**
  - End-to-end causal narrative is reproducible by reviewer.
  - Immediate containment + validation follow-up action captured.

### Journey 4 — Traceability assurance challenge
- **Open:** `/lineage/LIN_0039?incident=INC_TRACEABILITY_004&focus=kpi-card`
- **Expected walkthrough result:**
  - “Why trust this insight?” answered through narrative + technical lineage.
  - Rule/version/input provenance surfaced without manual data digging.
- **Success criteria:**
  - Reviewer reaches proof artifact in ≤ 2 clicks from claim.
  - Confidence caveats (if any) are visible and understandable.

### Journey 5 — Cross-domain handoff stress
- **Open:** `/process?plant=PLANT_01&incident=INC_HANDOFF_STRESS_005&domain=production,quality,logistics,maintenance`
- **Expected walkthrough result:**
  - Degraded handoffs are ranked and linked to event/graph evidence.
  - Domain owners align on actions and timing.
- **Success criteria:**
  - One actionable task per domain is documented.
  - Final decision summary includes impact + owner + deadline.

## UX enforcement checklist (release-gating)

### Language standards
- Severity label uses only: `normal`, `watch`, `elevated`, `violated`, `critical`.
- Trust label uses only: `unverified`, `provisional`, `supported`, `high-confidence`.
- Status label uses only: `on-track`, `at-risk`, `degraded`, `blocked`, `recovering`.

### Visual hierarchy
- Primary row: identity + severity + business impact.
- Secondary row: evidence + trust rationale.
- Tertiary row: technical metadata.
- CTA order: Investigate → Compare → Explain lineage → Export.

### Interaction latency targets (p95)
- Route transition with context retained: < 500 ms.
- Graph scoped update: < 900 ms.
- Object card hydration: < 700 ms.
- Lineage layer load (narrative + DAG): < 1000 ms.
- Search first result: < 600 ms.

## Final QA gates (must pass)

### 1) Semantic integrity
- Canonical semantics align with user-facing terminology.
- No unresolved semantic alias conflicts in surfaced objects.

### 2) Traversal completeness
- All scripted journeys complete without dead ends.
- Cross-space links preserve context on forward/back traversal.

### 3) Lineage explainability
- Decision claims can be traced to narrative + technical lineage evidence.
- Trust state is justified by explicit provenance.

### 4) Cross-domain decision usefulness
- Demonstration outputs at least one concrete action per impacted domain.
- Both executive and shopfloor observers confirm actionability.

## Demo completion record template
- Date/time:
- Build/commit:
- Presenter:
- Observer(s):
- Journey pass/fail (1–5):
- Latency SLA pass/fail:
- QA gate pass/fail (1–4):
- Risks/open issues:
- Go/No-go decision:
