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
            "id": "KPIOBS_0001",
            "kpi": "defect_rate",
            "line_id": ctx["line_id"],
            "window_start_utc": start,
            "window_end_utc": end,
            "value": defect_rate,
            "threshold": 0.05,
            "status": "violated" if defect_rate > 0.05 else "ok",
        },
        {
            "id": "KPIOBS_0002",
            "kpi": "disturbance_duration_minutes",
            "asset_id": ctx["asset_id"],
            "window_start_utc": start,
            "window_end_utc": end,
            "value": duration_minutes,
            "status": "high" if duration_minutes >= 30 else "normal",
        },
        {
            "id": "KPIOBS_0003",
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
    events: list[dict[str, Any]],
    kpis: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """5) lineage emission."""
    lineage: list[dict[str, Any]] = []
    n = 1

    for row in normalized["maintenance_logs"]:
        lineage.append(
            {
                "id": deterministic_id("LIN", n),
                "artifact_type": "mapping_rule",
                "name": "map_eam_work_order_to_maintenance_activity",
                "input_refs": [row["source_record_id"]],
                "output_refs": [row["payload"]["activity_id"]],
            }
        )
        n += 1

    first_overdue = next(e for e in events if e["type"] == "maintenance_overdue_threshold_crossed")
    lineage.append(
        {
            "id": deterministic_id("LIN", n),
            "artifact_type": "derivation_rule",
            "name": "derive_maintenance_overdue_event",
            "input_refs": [normalized["maintenance_logs"][0]["payload"]["activity_id"]],
            "output_refs": [first_overdue["id"]],
        }
    )
    n += 1

    lineage.append(
        {
            "id": deterministic_id("LIN", n),
            "artifact_type": "derivation_rule",
            "name": "derive_defect_rate_kpi",
            "input_refs": [r["payload"]["inspection_id"] for r in normalized["quality_inspections"]],
            "output_refs": [kpis[0]["id"]],
        }
    )

    return lineage


def stage_6_ui_payload(kpis: list[dict[str, Any]], events: list[dict[str, Any]]) -> list[dict[str, Any]]:
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
    return [
        {
            "page_id": "UI_PAGE_OVERVIEW_V1",
            "title": "Paint Line A Incident Overview",
            "cards": [
                {
                    "card_id": "UI_CARD_DEFECT_RATE",
                    "label": "Defect Rate",
                    "value": defect_kpi["value"],
                    "status": defect_kpi["status"],
                    "source_kpi_observation_id": defect_kpi["id"],
                }
            ],
            "timeline": top_events,
        }
    ]


def main() -> None:
    normalized, config = stage_1_normalize_sources()
    canonical_entities = stage_2_canonical_mapping(normalized, config)
    events, results = stage_3_events_and_results(normalized, config)
    kpis = stage_4_kpis(events, results, config)
    lineage = stage_5_lineage(normalized, events, kpis)
    ui_pages = stage_6_ui_payload(kpis, events)

    write_json(OUT_ROOT / "canonical/entities.json", canonical_entities)
    write_json(OUT_ROOT / "canonical/events.json", events)
    write_json(OUT_ROOT / "canonical/results.json", results)
    write_json(OUT_ROOT / "kpi/observations.json", kpis)
    write_json(OUT_ROOT / "lineage/artifacts.json", lineage)
    write_json(OUT_ROOT / "ui/pages.json", ui_pages)

    print("Generated deterministic PoC artifacts in data/generated/v1/")


if __name__ == "__main__":
    main()
