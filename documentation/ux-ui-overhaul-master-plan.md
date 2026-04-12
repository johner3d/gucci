# Automotive Manufacturing Intelligence — UX/UI & Product Experience Overhaul Master Plan

## Document purpose
This document is the implementation-grade blueprint for a complete UX/UI, information architecture, and product experience overhaul of the enterprise automotive manufacturing showcase.

This is not a cosmetic redesign brief. It is a product re-architecture plan focused on graph-native reasoning, lineage-explicit trust, and cross-functional manufacturing decision support.

---

## 1) Ruthless current-state diagnosis

### 1.1 Why the current UI fails
- The app behaves like a raw payload renderer rather than a productized intelligence system.
- Rendering patterns are debug-like (`ul`, `pre`, generic headings) instead of intent-driven analytical modules.
- There is no shared visual language (tokens, spacing system, severity scale, trust states).
- Visual hierarchy is flat: primary risks, supporting evidence, and technical metadata all compete equally.

### 1.2 Why the current information architecture fails
- The current route model is too thin (overview, graph, object card, lineage) and misses mandatory analysis spaces (process, event, object explorer as first-class workspace).
- No persistent global context model (plant, line, time window, incident scope, severity threshold).
- Navigation is link-chaining rather than guided reasoning.

### 1.3 Why it does not feel premium or management-grade
- Typography, spacing, and composition lack executive-grade polish and calmness.
- Severe signals are not framed with business impact and decision relevance.
- The product does not present a high-confidence “command center” posture.

### 1.4 Why it does not feel shopfloor-grade
- Handoffs between production, quality, logistics, and maintenance are not explicitly orchestrated.
- Event reality and process flow are underrepresented in core interactions.
- Investigation workflow is not optimized for operator speed.

### 1.5 Where it feels like a developer/internal tool
- Single-file route/component structure encourages proof-of-concept rendering patterns.
- Inline styles and one-off JSX blocks indicate prototype maturity.
- Lineage and graph are technically present but operationally under-productized.

### 1.6 Cognitive and structural weaknesses
- No explicit reasoning journey from signal → impact → root cause → action.
- Graph traversal is adjacency-level, not hypothesis-driven.
- Lineage is list-heavy and technical without layered explainability.
- Object cards are overlong and insufficiently prioritized.

---

## 2) Core target product thesis

The product should become a **manufacturing intelligence command center** that unifies KPI signals, events, process context, object semantics, graph dependencies, and lineage explainability into one coherent reasoning experience.

### Product promise
**From signal to trusted decision in minutes, with explicit evidence chains.**

### Why this beats siloed dashboards
- Shared cross-domain context instead of fragmented domain dashboards.
- Causal and dependency reasoning instead of static chart monitoring.
- Trust by design through lineage-backed explainability.

---

## 3) Target UX/UI character

### Visual tone
- Premium industrial, calm, exacting, and serious.

### Product personality
- Confident, transparent, analytical, and non-gimmicky.

### Density philosophy
- High capability with controlled cognitive load.
- Summary-first, depth-on-demand.

### Hierarchy philosophy
- Severity and business impact first.
- Causal evidence second.
- Technical traceability third (still easy to access).

### Definition of “wow” (without gimmicks)
- Fast comprehension of what happened, why it happened, what is impacted, and what to do next.

---

## 4) Information architecture

## 4.1 Top-level navigation (non-negotiable spaces)
1. Executive Overview
2. Process View
3. Event View
4. Graph Analysis
5. Object Explorer
6. Lineage

### 4.2 Global context bar (persistent)
- Plant, line, time window, incident scope, severity threshold, domain toggles.
- Active context chips with single-click removal.

### 4.3 Page responsibilities
- **Overview:** incident prioritization, impact framing, guided entry into deep dive.
- **Process:** cross-domain flow and handoff analysis.
- **Events:** temporal reality and sequence anomalies.
- **Graph:** root-cause/impact/dependency reasoning.
- **Object Explorer:** fast discovery and comparison of entities/artifacts.
- **Lineage:** trust and explainability.

### 4.4 What to remove/demote
- Raw payload dumps as default presentation.
- Equal emphasis on all metadata fields.
- Navigation that does not preserve context.

---

## 5) Navigation and cross-linking model

### 5.1 Principle
Every major UI artifact must offer meaningful transitions to the other spaces while preserving incident context.

### 5.2 Link contracts (examples)
- KPI card → Graph (upstream causes / downstream impact)
- Process step → Events (recent anomalies at this step)
- Event cluster → Object Explorer (affected objects)
- Graph node → Lineage (why this edge/node is trusted)
- Lineage artifact → Overview/Event/Graph modules that consume it

### 5.3 Context preservation
- Route transitions retain global filters and incident scope.
- Breadcrumbs include functional context, not only URL ancestry.
- Back-navigation restores exploration state rather than resetting the page.

### 5.4 Next-best-action logic
- Contextual CTA rail suggests highest-value next inquiry (e.g., “inspect upstream maintenance causality”).

---

## 6) Executive Overview strategy

### 6.1 Landing purpose
A management-grade and shopfloor-relevant command surface that instantly answers:
- What is most severe now?
- What is the likely impact?
- What evidence supports this?
- Where should we investigate first?

### 6.2 Core modules
- Priority incident stack
- Cross-domain impact strip (production/quality/logistics/maintenance)
- KPI breach panel with causal hints
- Process disruption heat summary
- Event anomaly highlights
- Trust/explainability status panel

### 6.3 Interaction posture
- Each card is action-oriented, with explicit deep dive intents.
- No dead-end summaries.

---

## 7) Process View strategy

### 7.1 Purpose
Reveal where value-stream flow is degraded and how handoffs propagate risk.

### 7.2 Why swimlanes matter
Swimlanes expose ownership boundaries and domain transitions that drive cross-functional investigations.

### 7.3 Required capabilities
- Lane-based process map with status overlays.
- Handoff quality indicators and latency markers.
- Drill-in from step to events, objects, KPIs, graph neighborhood, and lineage.

---

## 8) Event View strategy

### 8.1 Purpose
Represent the temporal truth of operations and anomalies.

### 8.2 Required interactions
- Multi-track timeline by event class/domain.
- Sequence patterning (normal vs anomalous).
- Correlation markers to KPI windows.
- Direct jumps from event to object, graph path, process step, and lineage artifact.

---

## 9) Graph Analysis strategy

### 9.1 Product intent
Graph is the analytical substrate for causality, dependency, and impact reasoning.

### 9.2 Anti-hairball controls
- Scoped subgraph by incident/time/domain/hop depth.
- Relationship-class toggles.
- Path ranking by confidence and business relevance.

### 9.3 Power without chaos
- Split-pane model: graph canvas + evidence/details panel.
- Clear edge semantics and legend.
- Explainable path summaries (“this path suggests X because Y”).

---

## 10) Object Explorer strategy

### 10.1 Search model
Unified search across business objects, events, lineage artifacts, and source representations.

### 10.2 Filtering model
Facets: type, domain, severity, status, time, relationship density, impacted scope.

### 10.3 Results model
- Rich result cards with state, relevance to active incident, and key relationship preview.
- Batch actions for compare, pin, and open in graph/process/event contexts.

---

## 11) Lineage View strategy

### 11.1 Productization direction
Transform lineage from technical trace list into layered explainability.

### 11.2 Two-level readability
1. Business narrative layer (“why this KPI/card is shown”).
2. Technical derivation layer (rules, versions, inputs/outputs, upstream/downstream).

### 11.3 Cross-link obligations
Each lineage node must link back to impacted KPI/object/event/process artifacts.

---

## 12) Object card redesign strategy

### 12.1 Summary layer (above the fold)
- Object identity + semantic role
- Severity/risk state
- Why this matters now
- Top impacts and likely causes
- Recommended next checks/actions

### 12.2 Progressive disclosure
Sections in descending operational value:
1. Key relationships and dependencies
2. Event timeline with anomaly cues
3. KPI coupling and threshold context
4. Graph neighborhood preview
5. Lineage explainability
6. Semantic definitions/glossary
7. Source IDs and raw attributes

### 12.3 Ergonomic ID handling
- Human labels prioritized, IDs secondary.
- Copy affordance and compact ID chips.

---

## 13) Search / filter / global context strategy

### 13.1 Global search behavior
Command-style search surface available from every page.

### 13.2 Scope management
- Scope toggles: active incident, active plant/line, entire dataset.
- Visual scope indicators to reduce interpretation mistakes.

### 13.3 Filter chips and breadcrumbs
- Persistent filter chips.
- Investigation breadcrumb that captures analytical path, not just route chain.

### 13.4 Operator-speed features
- Keyboard shortcuts.
- Saved views and pinned object sets.
- Rapid compare mode for similar objects/events.

### 13.5 Advanced filters disclosure
Hide advanced controls by default; reveal contextually to avoid clutter.

---

## 14) Visual design system strategy

### 14.1 Typography
- Strong hierarchy with legible compact body text.
- Distinct styles for decision signals vs technical evidence.

### 14.2 Spacing & composition
- Strict spacing scale and modular card grid.
- Predictable alignment and section rhythm.

### 14.3 Color/severity language
- Neutral base with calibrated semantic accents.
- Severity scale: normal/watch/elevated/violated/critical.

### 14.4 Iconography
- Domain and relationship icons used for scanning speed, not decoration.

### 14.5 Motion/transitions
- Subtle, purpose-driven transitions preserving context continuity.

### 14.6 System states
- Premium empty/loading/error states with actionable guidance.

---

## 15) Scripted showcase journeys (3–5) with seeded deep links

Use these deterministic journeys for demos, QA rehearsals, and acceptance sign-off. All links are route-safe for the existing PoC shell and preserve context using query parameters.

### 15.1 Journey A — Defect spike triage (executive-to-analyst handoff)
- **Seeded deep link:** `/executive?plant=PLANT_01&line=LINE_PAINT_1&incident=INC_DEFECT_SPIKE_001&severity=elevated`
- **Script:**
  1. Start on Executive Overview breach stack.
  2. Jump to ranked causality graph path.
  3. Confirm event chronology in Event View.
  4. Validate trust in Lineage View.
  5. Return with recommended mitigation and confidence.
- **Expected outcomes:**
  - Operator identifies top 1–2 root-cause candidates in < 3 minutes.
  - Evidence chain includes at least one event cluster and one lineage artifact.
  - Decision statement includes severity, trust level, and next action owner.

### 15.2 Journey B — Order risk to fulfillment impact
- **Seeded deep link:** `/logistics?plant=PLANT_01&order=ORD_10045&incident=INC_ORDER_RISK_002&severity=watch`
- **Script:**
  1. Open affected order and unit scope in Logistics.
  2. Pivot to Process View handoff latency points.
  3. Open impacted object cards for bottleneck entities.
  4. Validate downstream KPI impact in Executive Overview.
- **Expected outcomes:**
  - Team quantifies impacted orders/units and delay window.
  - At least one cross-domain dependency is explicitly named.
  - Mitigation option is prioritized by business impact.

### 15.3 Journey C — Asset disturbance causal propagation
- **Seeded deep link:** `/maintenance?plant=PLANT_01&asset=ASSET_PAINT_ROBOT_07&incident=INC_ASSET_DISTURBANCE_003&severity=critical`
- **Script:**
  1. Start from maintenance disturbance signal.
  2. Traverse graph path to quality defect spike.
  3. Open affected serial unit object card (`SU_900001`).
  4. Inspect lineage for rule/version and upstream inputs.
- **Expected outcomes:**
  - Causal chain from maintenance overdue status to KPI breach is explainable end-to-end.
  - Trust panel surfaces confidence rationale without raw-payload reading.
  - Proposed action captures immediate containment and follow-up verification.

### 15.4 Journey D — Traceability assurance challenge
- **Seeded deep link:** `/lineage/LIN_0039?incident=INC_TRACEABILITY_004&focus=kpi-card`
- **Script:**
  1. Start with “why should we trust this KPI insight?” challenge.
  2. Read business narrative lineage layer.
  3. Expand technical derivation DAG and source references.
  4. Jump back to consuming UI artifact in context.
- **Expected outcomes:**
  - Executive can map decision claim to specific lineage evidence.
  - Technical reviewer can verify rule/input provenance in < 2 clicks.
  - Any confidence caveat is visible before action recommendation.

### 15.5 Journey E — Cross-domain handoff stress test
- **Seeded deep link:** `/process?plant=PLANT_01&incident=INC_HANDOFF_STRESS_005&domain=production,quality,logistics,maintenance`
- **Script:**
  1. Open swimlane flow and identify degraded handoffs.
  2. Inspect correlated anomaly clusters in Events.
  3. Validate upstream/downstream dependencies in Graph.
  4. Summarize cross-domain impact and owner actions.
- **Expected outcomes:**
  - Handoff failure points are ranked by severity and business exposure.
  - Each impacted domain has one concrete follow-up action.
  - Walkthrough ends with a shared, evidence-backed decision.

---

## 16) UX language, hierarchy, and latency enforcement standards

These standards are release-gating; they are not optional style guidance.

### 16.1 UX language standards (severity, trust, status)
- **Severity vocabulary (only):** `normal`, `watch`, `elevated`, `violated`, `critical`.
- **Trust vocabulary (only):** `unverified`, `provisional`, `supported`, `high-confidence`.
- **Operational status vocabulary (only):** `on-track`, `at-risk`, `degraded`, `blocked`, `recovering`.
- Every insight card must display all three signals (severity, trust, status) in that order.
- No synonym drift in labels (e.g., “urgent”, “warning”, “okay”) outside the approved vocabulary.

### 16.2 Visual hierarchy consistency rules
- Primary row of every analytical card: incident/object identity + severity badge + business impact.
- Secondary row: evidence summary and trust rationale.
- Tertiary row: technical metadata (IDs, versions, source refs).
- CTA ordering is fixed: `Investigate` → `Compare` → `Explain lineage` → `Export`.
- Global context chips must remain visible above page fold on all core routes.

### 16.3 Interaction latency targets (demo and QA SLA)
- Context-preserving route transition: **p95 < 500 ms**.
- Graph scoped re-render (same incident): **p95 < 900 ms**.
- Object card hydration: **p95 < 700 ms**.
- Lineage narrative + DAG load: **p95 < 1000 ms**.
- Search first-result response: **p95 < 600 ms**.
- Any breach beyond SLA requires release waiver and documented remediation owner/date.

---

## 17) Phased implementation plan

### Phase 1 — Product foundation
- Introduce new IA, route model, app shell, global context, and design token scaffolding.

### Phase 2 — Decision-first surfaces
- Build Executive Overview v2, Object Explorer v2, and Object Card v2.

### Phase 3 — Analytical depth
- Implement Process View and Event View with cross-link contracts.
- Rebuild Graph Analysis for path-based reasoning.

### Phase 4 — Trust and explainability
- Productize Lineage View with layered narrative + technical DAG.
- Integrate trust indicators across all views.

### Phase 5 — Showcase hardening
- Storyline presets, performance tuning, accessibility, and demo-grade QA.

### Dependency order
1. IA/context contracts
2. design system primitives
3. page-level foundations
4. cross-link orchestration
5. trust/explainability unification

---

## 18) Risks / anti-patterns

- Fake sophistication (visual polish without reasoning integrity)
- Graph as decorative widget
- Lineage relegated to side information
- Beautiful cards with weak decision logic
- Cluttered density without hierarchy
- Over-modeling that slows users
- Under-modeling that hides causality
- Broken context persistence
- Siloed page behavior and disconnected transitions
- Shopfloor irrelevance hidden behind executive framing
- Sterile dashboarding with no investigation guidance

---

## 19) Final recommendation

Commit to a **product architecture-first overhaul**:
1. Lock global reasoning model and cross-space interaction contracts.
2. Then build the visual and interaction system around that model.
3. Only after those are stable, optimize polish and showcase choreography.

If implementation starts with superficial styling, the core product failure will remain intact under better visuals.

---

## Implementation directives (immediate)
- Do not begin with UI cosmetics.
- Do not fork by persona as primary IA.
- Keep graph and lineage as first-class analytical surfaces.
- Enforce context persistence and cross-link behavior across all pages.

---

## 20) Final QA gates (release blockers)

These four gates are mandatory for demo certification and implementation completion.

### Gate A — Semantic integrity
- Taxonomy, ontology classing, and entity semantics are internally consistent.
- No unresolved alias collisions for surfaced terms.
- User-visible semantic labels match canonical semantic references.

### Gate B — Traversal completeness
- Each scripted journey can be completed without dead-end navigation.
- Required cross-links (overview/process/events/graph/object/lineage) are intact.
- Back-navigation restores prior analytical context.

### Gate C — Lineage explainability
- Every major decision claim has narrative and technical lineage layers.
- Trust label is justified by explicit upstream evidence.
- Reviewers can identify rule/version/input lineage for showcased claims.

### Gate D — Cross-domain decision usefulness
- Journey output contains at least one decision/action per impacted domain.
- Decision summary includes business impact, owner, and timing expectation.
- Executive and shopfloor reviewers both rate outputs as operationally actionable.
