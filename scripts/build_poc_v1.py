#!/usr/bin/env python3
"""Deterministic PoC v1 build entrypoint."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "data/seed/v1/source_realistic"
CONFIG_PATH = ROOT / "data/seed/v1/config/seed-config.json"
OUT_ROOT = ROOT / "data/generated/v1"


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")


def parse_utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def fmt_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def deterministic_id(prefix: str, n: int) -> str:
    return f"{prefix}_{n:04d}"


def stage_1_normalize_sources() -> tuple[dict[str, list[dict[str, Any]]], dict[str, Any]]:
    """1) source representation normalization."""
    config = read_json(CONFIG_PATH)
    normalized: dict[str, list[dict[str, Any]]] = {}
    for path in sorted(SOURCE_DIR.glob("*.json")):
        rows = read_json(path)
        rows_sorted = sorted(rows, key=lambda row: row["source_record_id"])
        normalized[path.stem] = [
            {
                "source_file": path.name,
                "source_system": row["source_system"],
                "source_record_id": row["source_record_id"],
                "payload": row,
            }
            for row in rows_sorted
        ]
    return normalized, config


def stage_1b_source_representations(
    normalized: dict[str, list[dict[str, Any]]]
) -> list[dict[str, Any]]:
    """1b) source representation registry (one row per source row)."""
    representation_type_by_source = {
        "erp_orders": "order",
        "maintenance_logs": "maintenance",
        "mes_unit_tracking": "unit",
        "quality_inspections": "inspection",
    }
    canonical_id_key_by_source = {
        "erp_orders": "order_id",
        "maintenance_logs": "activity_id",
        "mes_unit_tracking": "serial_unit_id",
        "quality_inspections": "inspection_id",
    }

    representations: list[dict[str, Any]] = []
    n = 1
    for source_name in sorted(normalized.keys()):
        for row in normalized[source_name]:
            payload = row["payload"]
            representations.append(
                {
                    "source_representation_id": deterministic_id("SRCREP", n),
                    "source_system": row["source_system"],
                    "source_record_id": row["source_record_id"],
                    "represents_canonical_id": payload[canonical_id_key_by_source[source_name]],
                    "representation_type": representation_type_by_source[source_name],
                }
            )
            n += 1
    return representations


def stage_2_canonical_mapping(
    normalized: dict[str, list[dict[str, Any]]], config: dict[str, Any]
) -> dict[str, list[dict[str, Any]]]:
    """2) canonical mapping."""
    ctx = config["primary_issue_context"]

    product_codes = sorted(
        {r["payload"]["product_code"] for r in normalized["erp_orders"]}
    )
    products = [{"id": f"PROD_{code}", "source_product_code": code} for code in product_codes]

    variants = sorted(
        {r["payload"]["variant_code"] for r in normalized["erp_orders"]}
    )
    variant_entities = [
        {
            "id": variant,
            "product_id": f"PROD_{normalized['erp_orders'][0]['payload']['product_code']}",
        }
        for variant in variants
    ]

    orders = [
        {
            "id": r["payload"]["order_id"],
            "variant_id": r["payload"]["variant_code"],
            "planned_start_utc": r["payload"]["planned_start_utc"],
            "planned_end_utc": r["payload"]["planned_end_utc"],
        }
        for r in normalized["erp_orders"]
    ]

    serial_units = [
        {
            "id": r["payload"]["serial_unit_id"],
            "order_id": r["payload"]["order_id"],
            "batch_lot_id": r["payload"]["batch_lot_code"],
            "station_id": r["payload"]["station_code"],
        }
        for r in normalized["mes_unit_tracking"]
    ]

    inspections = [
        {
            "id": r["payload"]["inspection_id"],
            "serial_unit_id": r["payload"]["serial_unit_id"],
            "result": r["payload"]["result"],
            "defect_code": r["payload"]["defect_code"],
        }
        for r in normalized["quality_inspections"]
    ]

    return {
        "plant": [{"id": ctx["plant_id"]}],
        "line": [{"id": ctx["line_id"], "plant_id": ctx["plant_id"]}],
        "station": [{"id": ctx["station_id"], "line_id": ctx["line_id"]}],
        "asset": [{"id": ctx["asset_id"], "station_id": ctx["station_id"]}],
        "product": products,
        "variant": variant_entities,
        "production_order": orders,
        "serial_unit": serial_units,
        "inspection": inspections,
        "maintenance_activity": [
            {
                "id": r["payload"]["activity_id"],
                "asset_id": r["payload"]["asset_code"],
                "status": r["payload"]["status"],
            }
            for r in normalized["maintenance_logs"]
        ],
    }


def stage_3_events_and_results(
    normalized: dict[str, list[dict[str, Any]]], config: dict[str, Any]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """3) event/result derivation."""
    events: list[dict[str, Any]] = []
    results: list[dict[str, Any]] = []
    event_n = 1
    result_n = 1
    ctx = config["primary_issue_context"]

    for row in normalized["maintenance_logs"]:
        payload = row["payload"]
        due = parse_utc(payload["due_by_utc"])
        performed = parse_utc(payload["performed_at_utc"])
        disturbance_start = due + timedelta(minutes=40)
        disturbance_end = performed + timedelta(minutes=15)

        events.extend(
            [
                {
                    "id": deterministic_id("EVT", event_n),
                    "type": "maintenance_overdue_threshold_crossed",
                    "occurred_at_utc": payload["due_by_utc"],
                    "asset_id": payload["asset_code"],
                    "maintenance_activity_id": payload["activity_id"],
                },
                {
                    "id": deterministic_id("EVT", event_n + 1),
                    "type": "asset_disturbance_started",
                    "occurred_at_utc": fmt_utc(disturbance_start),
                    "asset_id": payload["asset_code"],
                    "station_id": ctx["station_id"],
                },
                {
                    "id": deterministic_id("EVT", event_n + 2),
                    "type": "maintenance_performed",
                    "occurred_at_utc": payload["performed_at_utc"],
                    "asset_id": payload["asset_code"],
                    "maintenance_activity_id": payload["activity_id"],
                },
                {
                    "id": deterministic_id("EVT", event_n + 3),
                    "type": "asset_disturbance_cleared",
                    "occurred_at_utc": fmt_utc(disturbance_end),
                    "asset_id": payload["asset_code"],
                    "station_id": ctx["station_id"],
                },
            ]
        )
        event_n += 4

    for row in normalized["mes_unit_tracking"]:
        payload = row["payload"]
        events.append(
            {
                "id": deterministic_id("EVT", event_n),
                "type": "unit_processed",
                "occurred_at_utc": payload["processed_at_utc"],
                "serial_unit_id": payload["serial_unit_id"],
                "station_id": payload["station_code"],
            }
        )
        event_n += 1

    for row in normalized["quality_inspections"]:
        payload = row["payload"]
        events.append(
            {
                "id": deterministic_id("EVT", event_n),
                "type": "inspection_executed",
                "occurred_at_utc": payload["executed_at_utc"],
                "inspection_id": payload["inspection_id"],
                "serial_unit_id": payload["serial_unit_id"],
            }
        )
        event_n += 1

        if payload["result"] == "NOK" and payload["defect_code"]:
            results.append(
                {
                    "id": deterministic_id("RES", result_n),
                    "type": "defect_detected",
                    "recorded_at_utc": payload["executed_at_utc"],
                    "inspection_id": payload["inspection_id"],
                    "serial_unit_id": payload["serial_unit_id"],
                    "defect_code": payload["defect_code"],
                }
            )
            result_n += 1

    events.sort(key=lambda event: (event["occurred_at_utc"], event["id"]))
    return events, results


def stage_4_kpis(
    events: list[dict[str, Any]],
    results: list[dict[str, Any]],
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    """4) KPI derivation."""
    ctx = config["primary_issue_context"]
    start = config["time_window"]["start_utc"]
    end = config["time_window"]["end_utc"]

    inspection_count = sum(1 for e in events if e["type"] == "inspection_executed")
    defect_count = len(results)
    defect_rate = round(defect_count / inspection_count, 3) if inspection_count else 0.0

    disturbance_start = next(e for e in events if e["type"] == "asset_disturbance_started")
    disturbance_end = next(e for e in events if e["type"] == "asset_disturbance_cleared")
    duration_minutes = int(
        (parse_utc(disturbance_end["occurred_at_utc"]) - parse_utc(disturbance_start["occurred_at_utc"])).total_seconds()
        // 60
    )

    order_delay_risk = "high" if defect_rate >= 0.5 else "medium"

    return [
        {
            "id": "KPIOBS_2101",
            "kpi": "defect_rate",
            "line_id": ctx["line_id"],
            "window_start_utc": start,
            "window_end_utc": end,
            "value": defect_rate,
            "threshold": 0.05,
            "status": "violated" if defect_rate > 0.05 else "ok",
        },
        {
            "id": "KPIOBS_2102",
            "kpi": "disturbance_duration_minutes",
            "asset_id": ctx["asset_id"],
            "window_start_utc": start,
            "window_end_utc": end,
            "value": duration_minutes,
            "status": "high" if duration_minutes >= 30 else "normal",
        },
        {
            "id": "KPIOBS_2103",
            "kpi": "order_delay_risk",
            "order_id": ctx["related_order_ids"][0],
            "window_start_utc": start,
            "window_end_utc": end,
            "value": order_delay_risk,
            "status": "elevated" if order_delay_risk == "high" else "watch",
        },
    ]


def stage_5_lineage(
    normalized: dict[str, list[dict[str, Any]]],
    source_representations: list[dict[str, Any]],
    entities: dict[str, list[dict[str, Any]]],
    events: list[dict[str, Any]],
    results: list[dict[str, Any]],
    kpis: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """5) lineage emission."""
    source_rep_by_record = {
        rep["source_record_id"]: rep["source_representation_id"] for rep in source_representations
    }
    lineage: list[dict[str, Any]] = []
    maintenance_activity_by_record = {
        row["source_record_id"]: row["payload"]["activity_id"] for row in normalized["maintenance_logs"]
    }
    inspection_by_record = {
        row["source_record_id"]: row["payload"]["inspection_id"] for row in normalized["quality_inspections"]
    }
    serial_unit_by_record = {
        row["source_record_id"]: row["payload"]["serial_unit_id"] for row in normalized["mes_unit_tracking"]
    }
    order_by_record = {
        row["source_record_id"]: row["payload"]["order_id"] for row in normalized["erp_orders"]
    }
    event_ids_by_type = {
        event_type: [event["id"] for event in events if event["type"] == event_type]
        for event_type in {event["type"] for event in events}
    }
    result_ids = [result["id"] for result in results]

    def append_artifact(
        artifact_id: str,
        artifact_type: str,
        rule_name: str,
        version: str,
        input_refs: list[str],
        output_refs: list[str],
        rationale: str,
    ) -> None:
        lineage.append(
            {
                "id": artifact_id,
                "artifact_type": artifact_type,
                "rule_name": rule_name,
                "version": version,
                "input_refs": input_refs,
                "output_refs": output_refs,
                "rationale": rationale,
            }
        )

    n = 1

    for source_name in sorted(normalized.keys()):
        for row in normalized[source_name]:
            payload = row["payload"]
            append_artifact(
                deterministic_id("LIN", n),
                "source_input_record",
                f"capture_{source_name}_record",
                "v1",
                [f"{row['source_system']}:{row['source_record_id']}"],
                [row["source_record_id"]],
                f"Ingested source record {row['source_record_id']} from {row['source_system']} to create a stable lineage entry point.",
            )
            n += 1

    for rep in source_representations:
        append_artifact(
            deterministic_id("LIN", n),
            "source_representation",
            f"normalize_{rep['representation_type']}_source_representation",
            "v1",
            [rep["source_record_id"]],
            [rep["source_representation_id"]],
            f"Normalized {rep['source_system']} source payload {rep['source_record_id']} into representation {rep['source_representation_id']}.",
        )
        n += 1

    for row in normalized["erp_orders"]:
        payload = row["payload"]
        append_artifact(
            deterministic_id("LIN", n),
            "canonical_mapping",
            "map_erp_order_representation_to_order_entity",
            "v1",
            [source_rep_by_record[row["source_record_id"]]],
            [payload["order_id"]],
            "Mapped normalized ERP order representation to canonical production order entity for cross-system joins.",
        )
        n += 1

    for row in normalized["mes_unit_tracking"]:
        payload = row["payload"]
        source_rep = source_rep_by_record[row["source_record_id"]]
        unit_processed_event = next(
            event
            for event in events
            if event["type"] == "unit_processed"
            and event["serial_unit_id"] == payload["serial_unit_id"]
            and event["occurred_at_utc"] == payload["processed_at_utc"]
        )
        append_artifact(
            deterministic_id("LIN", n),
            "canonical_mapping",
            "map_mes_unit_representation_to_serial_unit_entity",
            "v1",
            [source_rep],
            [payload["serial_unit_id"]],
            "Mapped MES unit representation to canonical serial unit identity.",
        )
        append_artifact(
            deterministic_id("LIN", n + 1),
            "derivation",
            "derive_unit_processed_event_from_mes_unit_representation",
            "v1",
            [source_rep, payload["serial_unit_id"]],
            [unit_processed_event["id"]],
            "Derived unit processed event from MES timestamps attached to the mapped serial unit.",
        )
        n += 2

    for row in normalized["maintenance_logs"]:
        payload = row["payload"]
        source_rep = source_rep_by_record[row["source_record_id"]]
        maintenance_events = [
            event
            for event in events
            if event.get("maintenance_activity_id") == payload["activity_id"]
            and event["type"]
            in {"maintenance_overdue_threshold_crossed", "maintenance_performed"}
        ]
        append_artifact(
            deterministic_id("LIN", n),
            "canonical_mapping",
            "map_eam_maintenance_representation_to_activity_entity",
            "v1",
            [source_rep],
            [payload["activity_id"]],
            "Mapped EAM maintenance representation to canonical maintenance activity.",
        )
        n += 1
        for event in maintenance_events:
            append_artifact(
                deterministic_id("LIN", n),
                "derivation",
                f"derive_{event['type']}_event_from_maintenance_activity",
                "v1",
                [source_rep, payload["activity_id"]],
                [event["id"]],
                f"Derived {event['type']} event from maintenance activity timing and state transitions.",
            )
            n += 1

    for row in normalized["quality_inspections"]:
        payload = row["payload"]
        source_rep = source_rep_by_record[row["source_record_id"]]
        inspection_event = next(
            event
            for event in events
            if event["type"] == "inspection_executed"
            and event["inspection_id"] == payload["inspection_id"]
        )
        append_artifact(
            deterministic_id("LIN", n),
            "canonical_mapping",
            "map_qms_inspection_representation_to_inspection_entity",
            "v1",
            [source_rep],
            [payload["inspection_id"]],
            "Mapped QMS inspection representation to canonical inspection object.",
        )
        append_artifact(
            deterministic_id("LIN", n + 1),
            "derivation",
            "derive_inspection_executed_event_from_inspection_representation",
            "v1",
            [source_rep, payload["inspection_id"]],
            [inspection_event["id"]],
            "Derived inspection executed event from inspection execution timestamp.",
        )
        n += 2
        defect_result = next(
            (result for result in results if result["inspection_id"] == payload["inspection_id"]),
            None,
        )
        if defect_result:
            append_artifact(
                deterministic_id("LIN", n),
                "derivation",
                "derive_defect_detected_result_from_inspection_representation",
                "v1",
                [source_rep, payload["inspection_id"]],
                [defect_result["id"]],
                "Derived defect result when inspection outcome is NOK and includes a defect code.",
            )
            n += 1

    first_overdue = next(e for e in events if e["type"] == "maintenance_overdue_threshold_crossed")
    append_artifact(
        deterministic_id("LIN", n),
        "derivation",
        "derive_maintenance_overdue_event",
        "v1",
        [maintenance_activity_by_record[normalized["maintenance_logs"][0]["source_record_id"]]],
        [first_overdue["id"]],
        "Derived maintenance overdue threshold crossing from due-by and performed timestamps.",
    )
    n += 1

    append_artifact(
        deterministic_id("LIN", n),
        "derivation",
        "derive_defect_rate_kpi",
        "v1",
        [r["payload"]["inspection_id"] for r in normalized["quality_inspections"]] + result_ids,
        [kpis[0]["id"]],
        "Calculated defect-rate KPI by dividing NOK defect results by executed inspections in the active window.",
    )
    n += 1

    append_artifact(
        deterministic_id("LIN", n),
        "derivation",
        "derive_disturbance_duration_kpi",
        "v1",
        event_ids_by_type["asset_disturbance_started"] + event_ids_by_type["asset_disturbance_cleared"],
        [kpis[1]["id"]],
        "Calculated disturbance-duration KPI from disturbance start and clear event timestamps.",
    )
    n += 1
    append_artifact(
        deterministic_id("LIN", n),
        "derivation",
        "derive_order_delay_risk_kpi",
        "v1",
        [kpis[0]["id"], kpis[1]["id"], order_by_record[normalized["erp_orders"][0]["source_record_id"]]],
        [kpis[2]["id"]],
        "Derived order-delay risk KPI from elevated quality and disturbance signals for the impacted order.",
    )
    n += 1

    append_artifact(
        deterministic_id("LIN", n),
        "ui_binding",
        "bind_kpi_to_overview_issue_card",
        "v1",
        [kpis[0]["id"]],
        ["UI_OVERVIEW_CARD_ISSUE_01"],
        "Bound the violated defect-rate KPI to the overview issue card so operators can quickly triage.",
    )
    n += 1
    append_artifact(
        deterministic_id("LIN", n),
        "ui_binding",
        "bind_asset_incident_object_card",
        "v1",
        [entities["asset"][0]["id"], kpis[1]["id"], first_overdue["id"]],
        ["UI_OBJECT_CARD_ASSET_PAINT_ROBOT_07"],
        "Rendered asset object card using canonical asset context and disturbance/maintenance signals.",
    )
    n += 1
    append_artifact(
        deterministic_id("LIN", n),
        "ui_binding",
        "bind_order_risk_object_card",
        "v1",
        [entities["production_order"][0]["id"], kpis[2]["id"], kpis[0]["id"]],
        ["UI_OBJECT_CARD_ORD_10045"],
        "Rendered order object card to explain downstream risk from defect-rate and delay indicators.",
    )
    n += 1
    append_artifact(
        deterministic_id("LIN", n),
        "ui_binding",
        "bind_serial_unit_object_card",
        "v1",
        [serial_unit_by_record[normalized["mes_unit_tracking"][0]["source_record_id"]], results[0]["id"], kpis[0]["id"]],
        ["UI_OBJECT_CARD_SU_900001"],
        "Rendered serial-unit card with defect evidence and KPI impact context.",
    )
    n += 1
    append_artifact(
        deterministic_id("LIN", n),
        "ui_binding",
        "bind_defect_rate_kpi_object_card",
        "v1",
        [kpis[0]["id"], kpis[1]["id"], kpis[2]["id"]],
        ["UI_OBJECT_CARD_KPIOBS_2101"],
        "Rendered KPI object card showing why this KPI is violated and how it connects to nearby indicators.",
    )

    output_to_artifact_ids: dict[str, list[str]] = {}
    for artifact in lineage:
        for output_ref in artifact["output_refs"]:
            output_to_artifact_ids.setdefault(output_ref, []).append(artifact["id"])

    for artifact in lineage:
        upstream = sorted(
            {
                upstream_id
                for input_ref in artifact["input_refs"]
                for upstream_id in output_to_artifact_ids.get(input_ref, [])
                if upstream_id != artifact["id"]
            }
        )
        downstream = sorted(
            {
                candidate["id"]
                for candidate in lineage
                if candidate["id"] != artifact["id"]
                and any(output_ref in candidate["input_refs"] for output_ref in artifact["output_refs"])
            }
        )
        artifact["upstream_artifact_ids"] = upstream
        artifact["downstream_artifact_ids"] = downstream

    return lineage


def stage_6_ui_payload(
    kpis: list[dict[str, Any]],
    events: list[dict[str, Any]],
    lineage: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """6) UI binding emission."""
    defect_kpi = next(k for k in kpis if k["kpi"] == "defect_rate")
    top_events = [
        {
            "id": event["id"],
            "type": event["type"],
            "occurred_at_utc": event["occurred_at_utc"],
        }
        for event in events[:6]
    ]
    overview_binding = next(
        artifact for artifact in lineage if "UI_OVERVIEW_CARD_ISSUE_01" in artifact["output_refs"]
    )
    return [
        {
            "page_id": "UI_PAGE_OVERVIEW_V1",
            "title": "Paint Line A Incident Overview",
            "cards": [
                {
                    "card_id": "UI_OVERVIEW_CARD_ISSUE_01",
                    "label": "Defect Rate",
                    "value": defect_kpi["value"],
                    "status": defect_kpi["status"],
                    "source_kpi_observation_id": defect_kpi["id"],
                    "lineage_artifact_id": overview_binding["id"],
                    "deep_link": {
                        "route": "/graph",
                        "focus_node_id": "KPIOBS_2101",
                        "path": ["UI_OVERVIEW_CARD_ISSUE_01", "KPIOBS_2101"],
                    },
                }
            ],
            "timeline": top_events,
        }
    ]


def stage_6b_canonical_relationships(
    entities: dict[str, list[dict[str, Any]]],
    source_representations: list[dict[str, Any]],
    results: list[dict[str, Any]],
    kpis: list[dict[str, Any]],
    lineage: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """6b) canonical relationship store for graph/process/entity experiences."""
    defect = results[0]
    derivation = next(a for a in lineage if a["artifact_type"] == "derivation" and "defect_rate" in a["rule_name"])
    active_start = min(kpi["window_start_utc"] for kpi in kpis if "window_start_utc" in kpi)
    active_end = max(kpi["window_end_utc"] for kpi in kpis if "window_end_utc" in kpi)
    mapped_reps = [r for r in source_representations if r["represents_canonical_id"] in derivation["input_refs"]]

    relationships = [
        {
            "id": "REL_0001",
            "source_id": "UI_OVERVIEW_CARD_ISSUE_01",
            "target_id": "KPIOBS_2101",
            "type": "rendered_from",
            "category": "semantic",
            "qualifiers": {
                "confidence": 0.97,
                "validity_interval": {"start_utc": active_start, "end_utc": active_end},
                "evidence_refs": [derivation["id"]],
                "polarity": "positive",
                "strength": 0.92,
            },
        },
        {
            "id": "REL_0002",
            "source_id": "KPIOBS_2101",
            "target_id": derivation["id"],
            "type": "derived_from",
            "category": "lineage",
            "qualifiers": {
                "confidence": 0.99,
                "validity_interval": {"start_utc": active_start, "end_utc": active_end},
                "evidence_refs": [derivation["id"]],
                "polarity": "positive",
                "strength": 1.0,
            },
        },
        {
            "id": "REL_0003",
            "source_id": defect["id"],
            "target_id": entities["serial_unit"][0]["id"],
            "type": "detected_on",
            "category": "operational",
            "qualifiers": {
                "confidence": 0.95,
                "validity_interval": {"start_utc": defect["recorded_at_utc"], "end_utc": defect["recorded_at_utc"]},
                "evidence_refs": [defect["id"]],
                "polarity": "negative",
                "strength": 0.9,
            },
        },
        {
            "id": "REL_0004",
            "source_id": entities["serial_unit"][0]["id"],
            "target_id": entities["station"][0]["id"],
            "type": "processed_at",
            "category": "processual",
            "qualifiers": {
                "confidence": 0.98,
                "validity_interval": {"start_utc": active_start, "end_utc": active_end},
                "evidence_refs": ["EVT_0005"],
                "polarity": "neutral",
                "strength": 0.83,
            },
        },
        {
            "id": "REL_0005",
            "source_id": entities["station"][0]["id"],
            "target_id": entities["asset"][0]["id"],
            "type": "processed_at",
            "category": "structural",
            "qualifiers": {
                "confidence": 0.99,
                "validity_interval": {"start_utc": active_start, "end_utc": active_end},
                "evidence_refs": [entities["station"][0]["id"], entities["asset"][0]["id"]],
                "polarity": "neutral",
                "strength": 0.88,
            },
        },
        {
            "id": "REL_0006",
            "source_id": "KPIOBS_2101",
            "target_id": defect["id"],
            "type": "detected_on",
            "category": "analytical",
            "qualifiers": {
                "confidence": 0.9,
                "validity_interval": {"start_utc": active_start, "end_utc": active_end},
                "evidence_refs": [defect["id"], "KPIOBS_2101"],
                "polarity": "negative",
                "strength": 0.84,
            },
        },
        {
            "id": "REL_0007",
            "source_id": "KPIOBS_2101",
            "target_id": entities["serial_unit"][0]["id"],
            "type": "observed_on",
            "category": "analytical",
            "qualifiers": {
                "confidence": 0.87,
                "validity_interval": {"start_utc": active_start, "end_utc": active_end},
                "evidence_refs": [defect["id"], entities["serial_unit"][0]["id"]],
                "polarity": "negative",
                "strength": 0.8,
            },
        },
        {
            "id": "REL_0008",
            "source_id": "KPIOBS_2101",
            "target_id": entities["production_order"][0]["id"],
            "type": "impacts",
            "category": "causal",
            "qualifiers": {
                "confidence": 0.86,
                "validity_interval": {"start_utc": active_start, "end_utc": active_end},
                "evidence_refs": ["KPIOBS_2101", "KPIOBS_2103"],
                "polarity": "negative",
                "strength": 0.79,
            },
        },
        {
            "id": "REL_0009",
            "source_id": "KPIOBS_2101",
            "target_id": "KPIOBS_2102",
            "type": "correlates_with",
            "category": "analytical",
            "qualifiers": {
                "confidence": 0.82,
                "validity_interval": {"start_utc": active_start, "end_utc": active_end},
                "evidence_refs": ["KPIOBS_2101", "KPIOBS_2102"],
                "polarity": "negative",
                "strength": 0.74,
            },
        },
        {
            "id": "REL_0010",
            "source_id": "KPIOBS_2101",
            "target_id": "KPIOBS_2103",
            "type": "influences",
            "category": "causal",
            "qualifiers": {
                "confidence": 0.85,
                "validity_interval": {"start_utc": active_start, "end_utc": active_end},
                "evidence_refs": ["KPIOBS_2101", "KPIOBS_2103"],
                "polarity": "negative",
                "strength": 0.81,
            },
        },
    ]

    rel_n = 11
    for rep in mapped_reps:
        relationships.append(
            {
                "id": deterministic_id("REL", rel_n),
                "source_id": derivation["id"],
                "target_id": rep["source_representation_id"],
                "type": "mapped_from",
                "category": "lineage",
                "qualifiers": {
                    "confidence": 0.99,
                    "validity_interval": {"start_utc": active_start, "end_utc": active_end},
                    "evidence_refs": [rep["source_record_id"], rep["source_representation_id"]],
                    "polarity": "positive",
                    "strength": 0.96,
                },
            }
        )
        rel_n += 1

    return relationships


def stage_7_graph_payload(
    entities: dict[str, list[dict[str, Any]]],
    source_representations: list[dict[str, Any]],
    results: list[dict[str, Any]],
    kpis: list[dict[str, Any]],
    lineage: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
) -> dict[str, Any]:
    """7) typed graph payload for graph exploration."""
    defect_kpi = next(k for k in kpis if k["id"] == "KPIOBS_2101")
    duration_kpi = next(k for k in kpis if k["id"] == "KPIOBS_2102")
    risk_kpi = next(k for k in kpis if k["id"] == "KPIOBS_2103")

    derivation = next(a for a in lineage if a["artifact_type"] == "derivation" and "defect_rate" in a["rule_name"])
    defect = results[0]

    nodes = [
        {"id": "UI_OVERVIEW_CARD_ISSUE_01", "type": "OverviewIssueCard", "label": "Overview Issue Card"},
        {"id": defect_kpi["id"], "type": "KPIObservation", "label": "Defect Rate KPI", "kpi": defect_kpi["kpi"], "value": defect_kpi["value"], "status": defect_kpi["status"]},
        {"id": duration_kpi["id"], "type": "KPIObservation", "label": "Disturbance Duration KPI", "kpi": duration_kpi["kpi"], "value": duration_kpi["value"], "status": duration_kpi["status"]},
        {"id": risk_kpi["id"], "type": "KPIObservation", "label": "Order Delay Risk KPI", "kpi": risk_kpi["kpi"], "value": risk_kpi["value"], "status": risk_kpi["status"]},
        {"id": derivation["id"], "type": "DerivationRule", "label": derivation["rule_name"]},
        {"id": entities["asset"][0]["id"], "type": "Asset", "label": entities["asset"][0]["id"]},
        {"id": entities["station"][0]["id"], "type": "Station", "label": entities["station"][0]["id"]},
        {"id": defect["id"], "type": "Defect", "label": defect["defect_code"], "code": defect["defect_code"]},
    ]

    nodes.extend(
        {"id": unit["id"], "type": "SerialUnit", "label": unit["id"]}
        for unit in entities["serial_unit"]
    )
    nodes.extend(
        {"id": order["id"], "type": "ProductionOrder", "label": order["id"]}
        for order in entities["production_order"]
    )
    nodes.extend(
        {
            "id": rep["source_representation_id"],
            "type": "SourceRepresentation",
            "label": rep["source_record_id"],
            "source_system": rep["source_system"],
        }
        for rep in source_representations
        if rep["represents_canonical_id"] in derivation["input_refs"]
    )

    edges = [
        {
            "id": rel["id"].replace("REL", "E"),
            "source": rel["source_id"],
            "target": rel["target_id"],
            "relationship": rel["type"],
            "relationship_class": "technical_lineage"
            if rel["category"] in {"lineage", "semantic"}
            else "business",
            "relationship_category": rel["category"],
            "qualifiers": rel["qualifiers"],
        }
        for rel in relationships
    ]

    return {
        "graph_id": "POC_V1_ISSUE_GRAPH",
        "default_focus_node_id": "KPIOBS_2101",
        "nodes": nodes,
        "edges": edges,
    }


def stage_8_object_cards(
    entities: dict[str, list[dict[str, Any]]],
    source_representations: list[dict[str, Any]],
    events: list[dict[str, Any]],
    results: list[dict[str, Any]],
    kpis: list[dict[str, Any]],
    lineage: list[dict[str, Any]],
    relationships: list[dict[str, Any]],
    semantic_bundle: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    """8) object-card payloads for object details UI."""

    event_or_result_time = lambda row: row.get("occurred_at_utc", row.get("recorded_at_utc", ""))
    entities_by_id = {
        obj["id"]: {"type": entity_type, "payload": obj}
        for entity_type, rows in entities.items()
        for obj in rows
    }
    source_reps_by_object = {
        object_id: [rep for rep in source_representations if rep["represents_canonical_id"] == object_id]
        for object_id in {"ASSET_PAINT_ROBOT_07", "ORD_10045", "SU_900001", "KPIOBS_2101"}
    }

    def lineage_links(object_id: str) -> list[dict[str, str]]:
        links = []
        for artifact in lineage:
            if object_id in artifact["input_refs"] or object_id in artifact["output_refs"]:
                links.append(
                    {
                        "artifact_id": artifact["id"],
                        "name": artifact["rule_name"],
                        "route": f"/lineage/{artifact['id']}",
                    }
                )
        return links

    object_ui_binding_id = {
        "ASSET_PAINT_ROBOT_07": next(
            artifact["id"] for artifact in lineage if "UI_OBJECT_CARD_ASSET_PAINT_ROBOT_07" in artifact["output_refs"]
        ),
        "ORD_10045": next(
            artifact["id"] for artifact in lineage if "UI_OBJECT_CARD_ORD_10045" in artifact["output_refs"]
        ),
        "SU_900001": next(
            artifact["id"] for artifact in lineage if "UI_OBJECT_CARD_SU_900001" in artifact["output_refs"]
        ),
        "KPIOBS_2101": next(
            artifact["id"] for artifact in lineage if "UI_OBJECT_CARD_KPIOBS_2101" in artifact["output_refs"]
        ),
    }

    def kpi_signal_rows(object_id: str) -> list[dict[str, Any]]:
        related: list[dict[str, Any]] = []
        for kpi in kpis:
            if (
                kpi.get("asset_id") == object_id
                or kpi.get("order_id") == object_id
                or kpi.get("line_id") == object_id
                or object_id == "KPIOBS_2101"
            ):
                related.append(kpi)
        seen_ids = set()
        unique_related = []
        for kpi in related:
            if kpi["id"] in seen_ids:
                continue
            unique_related.append(kpi)
            seen_ids.add(kpi["id"])
        return unique_related

    rels_by_source: dict[str, list[dict[str, Any]]] = {}
    for relationship in relationships:
        rels_by_source.setdefault(relationship["source_id"], []).append(relationship)

    def business_relationship_rows(object_id: str) -> list[dict[str, Any]]:
        rows = []
        for relationship in rels_by_source.get(object_id, []):
            rows.append(
                {
                    "relationship": relationship["type"],
                    "target_id": relationship["target_id"],
                    "target_type": entities_by_id.get(relationship["target_id"], {}).get("type", "Unknown"),
                    "relationship_category": relationship["category"],
                    "qualifiers": relationship["qualifiers"],
                }
            )
        return rows

    entity_semantics = semantic_bundle["entity_semantics"]
    ontology_by_id = {item["id"]: item for item in semantic_bundle["ontology_classes"]}
    taxonomy_by_id = {item["id"]: item for item in semantic_bundle["taxonomy_nodes"]}
    term_by_id = {item["id"]: item for item in semantic_bundle["terms"]}
    aliases_by_term: dict[str, list[str]] = {}
    for alias in semantic_bundle["aliases"]:
        aliases_by_term.setdefault(alias["term_id"], []).append(alias["alias"])
    semantic_rule_by_id = {item["id"]: item for item in semantic_bundle["rules"]}

    def meaning_ontology_section(object_id: str) -> dict[str, Any]:
        mapped = entity_semantics.get(object_id, {"ontology_class_ids": [], "semantic_tags": []})
        class_ids = mapped["ontology_class_ids"]
        semantic_tags = mapped["semantic_tags"]
        taxonomy_ids = sorted(
            {
                tax_id
                for class_id in class_ids
                for tax_id in ontology_by_id.get(class_id, {}).get("taxonomy_node_ids", [])
            }
        )
        term_ids = sorted(
            {
                term["id"]
                for term in semantic_bundle["terms"]
                if term["class_id"] in class_ids
                or any(tag in term.get("semantic_tags", []) for tag in semantic_tags)
            }
        )
        rule_ids = sorted(
            {
                rule["id"]
                for rule in semantic_bundle["rules"]
                if object_id in rule.get("linked_entity_ids", [])
            }
        )
        return {
            "ontology_classes": [
                {
                    "id": class_id,
                    "label": ontology_by_id[class_id]["label"],
                    "definition": ontology_by_id[class_id]["definition"],
                }
                for class_id in class_ids
                if class_id in ontology_by_id
            ],
            "semantic_tags": semantic_tags,
            "taxonomy_nodes": [taxonomy_by_id[tax_id] for tax_id in taxonomy_ids if tax_id in taxonomy_by_id],
            "terms": [
                {
                    **term_by_id[term_id],
                    "aliases": aliases_by_term.get(term_id, []),
                }
                for term_id in term_ids
                if term_id in term_by_id
            ],
            "linked_rules": [
                {
                    "id": rule_id,
                    "label": semantic_rule_by_id[rule_id]["label"],
                    "definition": semantic_rule_by_id[rule_id]["definition"],
                    "lineage_rule_names": semantic_rule_by_id[rule_id]["lineage_rule_names"],
                }
                for rule_id in rule_ids
                if rule_id in semantic_rule_by_id
            ],
        }

    cards = {
        "ASSET_PAINT_ROBOT_07": {
            "card_schema_version": "v1",
            "object_id": "ASSET_PAINT_ROBOT_07",
            "canonical_identity": {
                "id": "ASSET_PAINT_ROBOT_07",
                "type": "Asset",
                "label": "Paint Robot 07",
            },
            "source_representations": source_reps_by_object["ASSET_PAINT_ROBOT_07"],
            "semantic_meaning": {
                "summary": "Primary paint-line robot asset executing spray operations at ST_PAINT_BOOTH_03.",
            },
            "meaning_ontology": meaning_ontology_section("ASSET_PAINT_ROBOT_07"),
            "current_state_snapshot": {
                "status": "disturbance_resolved_after_overdue_maintenance",
                "as_of_utc": "2026-01-15T09:25:00Z",
                "attributes": entities_by_id["ASSET_PAINT_ROBOT_07"]["payload"],
            },
            "key_relationships": {
                "business_graph": business_relationship_rows("ASSET_PAINT_ROBOT_07")
            },
            "related_timeline": sorted(
                [row for row in events if row.get("asset_id") == "ASSET_PAINT_ROBOT_07"],
                key=event_or_result_time,
            ),
            "relevant_kpi_signals": kpi_signal_rows("ASSET_PAINT_ROBOT_07"),
            "impacted_objects": [
                {"id": "SU_900001", "type": "SerialUnit", "reason": "processed while disturbance was active"},
                {"id": "ORD_10045", "type": "ProductionOrder", "reason": "contains disrupted units tied to defect risk"},
            ],
            "lineage_entry_links": lineage_links("ASSET_PAINT_ROBOT_07"),
            "issue_context": {
                "why_this_object_matters_now": "Maintenance overdue and disturbance around this asset precede the defect-rate violation.",
            },
            "primary_lineage_artifact_id": object_ui_binding_id["ASSET_PAINT_ROBOT_07"],
        },
        "ORD_10045": {
            "card_schema_version": "v1",
            "object_id": "ORD_10045",
            "canonical_identity": {"id": "ORD_10045", "type": "ProductionOrder", "label": "Production Order 10045"},
            "source_representations": source_reps_by_object["ORD_10045"],
            "semantic_meaning": {
                "summary": "Order grouping multiple serial units for VAR_SEDAN_RED_PREM through the paint line window.",
            },
            "meaning_ontology": meaning_ontology_section("ORD_10045"),
            "current_state_snapshot": {
                "status": "at_risk",
                "as_of_utc": "2026-01-15T14:00:00Z",
                "attributes": entities_by_id["ORD_10045"]["payload"],
            },
            "key_relationships": {
                "business_graph": business_relationship_rows("ORD_10045")
            },
            "related_timeline": sorted(
                [row for row in events if row.get("serial_unit_id") in {"SU_900001", "SU_900002"}],
                key=event_or_result_time,
            ),
            "relevant_kpi_signals": kpi_signal_rows("ORD_10045"),
            "impacted_objects": [
                {"id": "KPIOBS_2103", "type": "KPIObservation", "reason": "order delay risk elevated"},
                {"id": "KPIOBS_2101", "type": "KPIObservation", "reason": "defect spike concentrated on one unit in this order"},
            ],
            "lineage_entry_links": lineage_links("ORD_10045"),
            "issue_context": {
                "why_this_object_matters_now": "Defects detected on units within this order raise delay and rework risk.",
            },
            "primary_lineage_artifact_id": object_ui_binding_id["ORD_10045"],
        },
        "SU_900001": {
            "card_schema_version": "v1",
            "object_id": "SU_900001",
            "canonical_identity": {"id": "SU_900001", "type": "SerialUnit", "label": "Serial Unit 900001"},
            "source_representations": source_reps_by_object["SU_900001"],
            "semantic_meaning": {
                "summary": "Single manufactured unit tracked through processing and inspection lifecycle.",
            },
            "meaning_ontology": meaning_ontology_section("SU_900001"),
            "current_state_snapshot": {
                "status": "defect_detected",
                "as_of_utc": "2026-01-15T08:45:00Z",
                "attributes": entities_by_id["SU_900001"]["payload"],
            },
            "key_relationships": {
                "business_graph": business_relationship_rows("SU_900001")
            },
            "related_timeline": sorted(
                [row for row in [*events, *results] if row.get("serial_unit_id") == "SU_900001"],
                key=event_or_result_time,
            ),
            "relevant_kpi_signals": [kpi for kpi in kpis if kpi["id"] in {"KPIOBS_2101", "KPIOBS_2103"}],
            "impacted_objects": [
                {"id": "ORD_10045", "type": "ProductionOrder", "reason": "unit defect adds order delay risk"},
                {"id": "KPIOBS_2101", "type": "KPIObservation", "reason": "defect contributes to violated defect rate"},
            ],
            "lineage_entry_links": lineage_links("SU_900001"),
            "issue_context": {
                "why_this_object_matters_now": "This unit carries the defect result feeding the active defect-rate issue.",
            },
            "primary_lineage_artifact_id": object_ui_binding_id["SU_900001"],
        },
        "KPIOBS_2101": {
            "card_schema_version": "v1",
            "object_id": "KPIOBS_2101",
            "canonical_identity": {"id": "KPIOBS_2101", "type": "KPIObservation", "label": "Defect Rate Observation"},
            "source_representations": [
                rep
                for rep in source_representations
                if rep["represents_canonical_id"] in {"INSP_81001", "INSP_81002", "INSP_81003"}
            ],
            "semantic_meaning": {
                "summary": "Aggregated defect-rate signal for LINE_PAINT_A over the active operational window.",
            },
            "meaning_ontology": meaning_ontology_section("KPIOBS_2101"),
            "current_state_snapshot": {
                "status": "violated",
                "as_of_utc": "2026-01-15T14:00:00Z",
                "attributes": next(kpi for kpi in kpis if kpi["id"] == "KPIOBS_2101"),
            },
            "key_relationships": {
                "business_graph": business_relationship_rows("KPIOBS_2101")
            },
            "related_timeline": sorted(
                [row for row in [*events, *results] if row.get("serial_unit_id") == "SU_900001"] + [kpis[0]],
                key=event_or_result_time,
            ),
            "relevant_kpi_signals": [kpi for kpi in kpis if kpi["id"] in {"KPIOBS_2101", "KPIOBS_2102", "KPIOBS_2103"}],
            "impacted_objects": [
                {"id": "SU_900001", "type": "SerialUnit", "reason": "defect contribution in window"},
                {"id": "ORD_10045", "type": "ProductionOrder", "reason": "quality signal drives delay risk"},
                {"id": "ASSET_PAINT_ROBOT_07", "type": "Asset", "reason": "possible root cause from disturbance pattern"},
            ],
            "lineage_entry_links": lineage_links("KPIOBS_2101"),
            "issue_context": {
                "why_this_object_matters_now": "This violated KPI is the top-level trigger for the current incident workflow.",
            },
            "primary_lineage_artifact_id": object_ui_binding_id["KPIOBS_2101"],
        },
    }
    return cards


def stage_8b_semantic_artifacts(
    entities: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    """8b) semantic artifacts used by object detail and graph exploration."""
    ontology_classes = [
        {
            "id": "ONT_CLASS_MANUFACTURING_SITE",
            "label": "Manufacturing Site",
            "definition": "A plant-level location where production operations are executed.",
            "taxonomy_node_ids": ["TAX_PRODUCTION"],
        },
        {
            "id": "ONT_CLASS_PRODUCTION_LINE",
            "label": "Production Line",
            "definition": "A coordinated sequence of stations performing transformation steps.",
            "taxonomy_node_ids": ["TAX_PRODUCTION"],
        },
        {
            "id": "ONT_CLASS_WORK_STATION",
            "label": "Work Station",
            "definition": "A process location where units are processed by equipment and operators.",
            "taxonomy_node_ids": ["TAX_PRODUCTION", "TAX_UNIT_TRACKING"],
        },
        {
            "id": "ONT_CLASS_PHYSICAL_ASSET",
            "label": "Physical Asset",
            "definition": "A durable production resource that performs work in the manufacturing process.",
            "taxonomy_node_ids": ["TAX_ASSETS", "TAX_PAINT_LINE_ASSETS"],
        },
        {
            "id": "ONT_CLASS_PRODUCTION_ORDER",
            "label": "Production Order",
            "definition": "A planned work package that groups units and process steps for delivery.",
            "taxonomy_node_ids": ["TAX_PRODUCTION", "TAX_ORDER_EXECUTION"],
        },
        {
            "id": "ONT_CLASS_SERIALIZED_UNIT",
            "label": "Serialized Unit",
            "definition": "A uniquely identifiable produced item tracked through process and quality states.",
            "taxonomy_node_ids": ["TAX_PRODUCTION", "TAX_UNIT_TRACKING"],
        },
        {
            "id": "ONT_CLASS_KPI_OBSERVATION",
            "label": "KPI Observation",
            "definition": "A measured indicator over a time window used to monitor operational performance.",
            "taxonomy_node_ids": ["TAX_ANALYTICS", "TAX_QUALITY_METRICS"],
        },
        {
            "id": "ONT_CLASS_PRODUCT",
            "label": "Product",
            "definition": "Commercial product family represented in master and planning systems.",
            "taxonomy_node_ids": ["TAX_PRODUCTION"],
        },
        {
            "id": "ONT_CLASS_PRODUCT_VARIANT",
            "label": "Product Variant",
            "definition": "Specific configurable variant of a base product.",
            "taxonomy_node_ids": ["TAX_PRODUCTION"],
        },
        {
            "id": "ONT_CLASS_QUALITY_INSPECTION",
            "label": "Quality Inspection",
            "definition": "Quality control observation tied to a serialized unit.",
            "taxonomy_node_ids": ["TAX_QUALITY_METRICS", "TAX_UNIT_TRACKING"],
        },
        {
            "id": "ONT_CLASS_MAINTENANCE_ACTIVITY",
            "label": "Maintenance Activity",
            "definition": "Planned or executed maintenance work item on an asset.",
            "taxonomy_node_ids": ["TAX_ASSETS"],
        },
    ]

    taxonomy_nodes = [
        {"id": "TAX_ASSETS", "label": "Assets", "parent_id": None, "cross_links": [{"surface": "object_explorer", "route": "/objects/ASSET_PAINT_ROBOT_07"}, {"surface": "graph", "route": "/graph?focus=ASSET_PAINT_ROBOT_07&mode=impact"}]},
        {"id": "TAX_PAINT_LINE_ASSETS", "label": "Paint Line Assets", "parent_id": "TAX_ASSETS", "cross_links": [{"surface": "object_explorer", "route": "/objects/ASSET_PAINT_ROBOT_07"}, {"surface": "graph", "route": "/graph?focus=ASSET_PAINT_ROBOT_07&mode=impact"}]},
        {"id": "TAX_PRODUCTION", "label": "Production", "parent_id": None, "cross_links": [{"surface": "object_explorer", "route": "/objects/ORD_10045"}, {"surface": "graph", "route": "/graph?focus=ORD_10045&mode=impact"}]},
        {"id": "TAX_ORDER_EXECUTION", "label": "Order Execution", "parent_id": "TAX_PRODUCTION", "cross_links": [{"surface": "object_explorer", "route": "/objects/ORD_10045"}, {"surface": "graph", "route": "/graph?focus=ORD_10045&mode=impact"}]},
        {"id": "TAX_UNIT_TRACKING", "label": "Unit Tracking", "parent_id": "TAX_PRODUCTION", "cross_links": [{"surface": "object_explorer", "route": "/objects/SU_900001"}, {"surface": "graph", "route": "/graph?focus=SU_900001&mode=impact"}]},
        {"id": "TAX_ANALYTICS", "label": "Analytics", "parent_id": None, "cross_links": [{"surface": "object_explorer", "route": "/objects/KPIOBS_2101"}, {"surface": "graph", "route": "/graph?focus=KPIOBS_2101&mode=impact"}]},
        {"id": "TAX_QUALITY_METRICS", "label": "Quality Metrics", "parent_id": "TAX_ANALYTICS", "cross_links": [{"surface": "object_explorer", "route": "/objects/KPIOBS_2101"}, {"surface": "graph", "route": "/graph?focus=KPIOBS_2101&mode=impact"}]},
    ]

    terms = [
        {"id": "TERM_PAINT_ROBOT", "term": "Paint Robot", "class_id": "ONT_CLASS_PHYSICAL_ASSET", "definition": "Robotic applicator used in the paint booth process.", "semantic_tags": ["asset", "automation", "paint_line"], "cross_links": [{"surface": "object_explorer", "route": "/objects/ASSET_PAINT_ROBOT_07"}, {"surface": "graph", "route": "/graph?focus=ASSET_PAINT_ROBOT_07&mode=impact"}]},
        {"id": "TERM_PRODUCTION_ORDER", "term": "Production Order", "class_id": "ONT_CLASS_PRODUCTION_ORDER", "definition": "Execution container for planned manufacturing work.", "semantic_tags": ["production", "planning", "fulfillment"], "cross_links": [{"surface": "object_explorer", "route": "/objects/ORD_10045"}, {"surface": "graph", "route": "/graph?focus=ORD_10045&mode=impact"}]},
        {"id": "TERM_SERIAL_UNIT", "term": "Serial Unit", "class_id": "ONT_CLASS_SERIALIZED_UNIT", "definition": "Uniquely tracked produced unit with lineage and quality results.", "semantic_tags": ["traceability", "quality", "manufacturing"], "cross_links": [{"surface": "object_explorer", "route": "/objects/SU_900001"}, {"surface": "graph", "route": "/graph?focus=SU_900001&mode=impact"}]},
        {"id": "TERM_DEFECT_RATE", "term": "Defect Rate", "class_id": "ONT_CLASS_KPI_OBSERVATION", "definition": "Share of inspected units marked non-conforming within a window.", "semantic_tags": ["kpi", "quality", "risk_signal"], "cross_links": [{"surface": "object_explorer", "route": "/objects/KPIOBS_2101"}, {"surface": "graph", "route": "/graph?focus=KPIOBS_2101&mode=impact"}]},
    ]

    aliases = [
        {"id": "ALIAS_0001", "term_id": "TERM_PAINT_ROBOT", "alias": "Spray Robot"},
        {"id": "ALIAS_0002", "term_id": "TERM_PAINT_ROBOT", "alias": "Paint Applicator"},
        {"id": "ALIAS_0003", "term_id": "TERM_PRODUCTION_ORDER", "alias": "Work Order"},
        {"id": "ALIAS_0004", "term_id": "TERM_SERIAL_UNIT", "alias": "Unit Instance"},
        {"id": "ALIAS_0005", "term_id": "TERM_DEFECT_RATE", "alias": "NOK Ratio"},
    ]

    rules = [
        {
            "id": "SEM_RULE_ASSET_HEALTH",
            "label": "Asset Disturbance Semantics",
            "definition": "Asset disturbance and maintenance overdue events classify the asset as incident-relevant.",
            "lineage_rule_names": [
                "derive_maintenance_overdue_event",
                "derive_maintenance_overdue_threshold_crossed_event_from_maintenance_activity",
            ],
            "linked_entity_ids": ["ASSET_PAINT_ROBOT_07"],
        },
        {
            "id": "SEM_RULE_ORDER_RISK",
            "label": "Order Risk Propagation",
            "definition": "Order risk is inferred when defect-rate and disturbance signals exceed policy thresholds.",
            "lineage_rule_names": ["derive_order_delay_risk_kpi", "bind_order_risk_object_card"],
            "linked_entity_ids": ["ORD_10045"],
        },
        {
            "id": "SEM_RULE_UNIT_DEFECT",
            "label": "Unit Defect Classification",
            "definition": "A serial unit is defect-bearing when inspection outcome is NOK with a defect code.",
            "lineage_rule_names": [
                "derive_defect_detected_result_from_inspection_representation",
                "bind_serial_unit_object_card",
            ],
            "linked_entity_ids": ["SU_900001"],
        },
        {
            "id": "SEM_RULE_KPI_VIOLATION",
            "label": "KPI Violation Interpretation",
            "definition": "Defect-rate KPI is interpreted as violated when value breaches configured threshold.",
            "lineage_rule_names": ["derive_defect_rate_kpi", "bind_kpi_to_overview_issue_card"],
            "linked_entity_ids": ["KPIOBS_2101"],
        },
    ]

    class_by_entity_type = {
        "plant": ["ONT_CLASS_MANUFACTURING_SITE"],
        "line": ["ONT_CLASS_PRODUCTION_LINE"],
        "station": ["ONT_CLASS_WORK_STATION"],
        "asset": ["ONT_CLASS_PHYSICAL_ASSET"],
        "product": ["ONT_CLASS_PRODUCT"],
        "variant": ["ONT_CLASS_PRODUCT_VARIANT"],
        "production_order": ["ONT_CLASS_PRODUCTION_ORDER"],
        "serial_unit": ["ONT_CLASS_SERIALIZED_UNIT"],
        "inspection": ["ONT_CLASS_QUALITY_INSPECTION"],
        "maintenance_activity": ["ONT_CLASS_MAINTENANCE_ACTIVITY"],
    }
    tags_by_entity_type = {
        "asset": ["asset", "operational", "maintenance_sensitive"],
        "production_order": ["production", "fulfillment", "risk_bearing"],
        "serial_unit": ["traceability", "quality", "defect_exposed"],
        "line": ["production_context", "line_scope"],
        "plant": ["production_context", "site_scope"],
        "station": ["process_node", "manufacturing_station"],
        "variant": ["product_model", "configuration"],
        "product": ["product_master", "catalog"],
        "inspection": ["quality_record", "inspection_event"],
        "maintenance_activity": ["maintenance", "asset_health"],
    }
    entity_semantics: dict[str, dict[str, list[str]]] = {}
    for entity_type, rows in entities.items():
        for row in rows:
            entity_semantics[row["id"]] = {
                "ontology_class_ids": class_by_entity_type.get(entity_type, ["ONT_CLASS_PRODUCT"]),
                "semantic_tags": tags_by_entity_type.get(entity_type, ["canonical_entity"]),
            }
    entity_semantics["KPIOBS_2101"] = {
        "ontology_class_ids": ["ONT_CLASS_KPI_OBSERVATION"],
        "semantic_tags": ["kpi", "quality", "incident_trigger"],
    }

    return {
        "ontology_classes": ontology_classes,
        "taxonomy_nodes": taxonomy_nodes,
        "terms": terms,
        "aliases": aliases,
        "rules": rules,
        "entity_semantics": entity_semantics,
    }


def main() -> None:
    normalized, config = stage_1_normalize_sources()
    source_representations = stage_1b_source_representations(normalized)
    canonical_entities = stage_2_canonical_mapping(normalized, config)
    events, results = stage_3_events_and_results(normalized, config)
    kpis = stage_4_kpis(events, results, config)
    lineage = stage_5_lineage(normalized, source_representations, canonical_entities, events, results, kpis)
    ui_pages = stage_6_ui_payload(kpis, events, lineage)
    relationships = stage_6b_canonical_relationships(
        canonical_entities, source_representations, results, kpis, lineage
    )
    graph = stage_7_graph_payload(
        canonical_entities, source_representations, results, kpis, lineage, relationships
    )
    semantic_bundle = stage_8b_semantic_artifacts(canonical_entities)
    object_cards = stage_8_object_cards(
        canonical_entities,
        source_representations,
        events,
        results,
        kpis,
        lineage,
        relationships,
        semantic_bundle,
    )

    write_json(OUT_ROOT / "canonical/source_representations.json", source_representations)
    write_json(OUT_ROOT / "canonical/entities.json", canonical_entities)
    write_json(OUT_ROOT / "canonical/events.json", events)
    write_json(OUT_ROOT / "canonical/results.json", results)
    write_json(OUT_ROOT / "canonical/relationships.json", relationships)
    write_json(OUT_ROOT / "kpi/observations.json", kpis)
    write_json(OUT_ROOT / "lineage/artifacts.json", lineage)
    write_json(OUT_ROOT / "ui/pages.json", ui_pages)
    write_json(OUT_ROOT / "ui/graph.json", graph)
    write_json(OUT_ROOT / "semantic/ontology_classes.json", semantic_bundle["ontology_classes"])
    write_json(OUT_ROOT / "semantic/taxonomy_nodes.json", semantic_bundle["taxonomy_nodes"])
    write_json(OUT_ROOT / "semantic/terms.json", semantic_bundle["terms"])
    write_json(OUT_ROOT / "semantic/aliases.json", semantic_bundle["aliases"])
    write_json(OUT_ROOT / "semantic/rules.json", semantic_bundle["rules"])
    write_json(OUT_ROOT / "semantic/entity_semantics.json", semantic_bundle["entity_semantics"])
    for object_id, object_card in object_cards.items():
        write_json(OUT_ROOT / f"ui/object_cards/{object_id}.json", object_card)

    print("Generated deterministic PoC artifacts in data/generated/v1/")


if __name__ == "__main__":
    main()
