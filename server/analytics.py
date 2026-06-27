import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

TABLE_NAME = "parking_slot_history"


def _connect():
    database_url = os.environ.get("DATABASE_URL", "").strip().strip('"').strip("'")
    if not database_url:
        return None

    try:
        import psycopg2
    except ImportError:
        logger.warning("psycopg2 is not installed; analytics disabled")
        return None

    try:
        return psycopg2.connect(database_url)
    except Exception as exc:
        logger.warning("Failed to connect analytics database: %s", exc)
        return None


def _fetchall(cursor, query: str, params: tuple = ()) -> list[tuple]:
    cursor.execute(query, params)
    return cursor.fetchall()


def fetch_analytics_summary() -> dict[str, Any]:
    conn = _connect()
    if conn is None:
        return {"available": False}

    try:
        with conn.cursor() as cursor:
            summary_row = _fetchall(
                cursor,
                f"""
                SELECT
                  COUNT(*) FILTER (WHERE status = 'active' AND occupied = 1) AS occupied,
                  COUNT(*) FILTER (WHERE status = 'active') AS tracked_slots,
                  COUNT(*) AS total_events
                FROM {TABLE_NAME}
                """,
            )[0]
            occupied, tracked_slots, total_events = summary_row
            occupancy_pct = round(100.0 * occupied / tracked_slots, 1) if tracked_slots else 0.0

            traffic_rows = _fetchall(
                cursor,
                f"""
                SELECT
                  TO_CHAR(DATE_TRUNC('minute', startdate), 'HH24:MI') AS minute_label,
                  COUNT(*) FILTER (WHERE occupied = 1) AS entries,
                  COUNT(*) FILTER (WHERE occupied = 0) AS exits
                FROM {TABLE_NAME}
                GROUP BY DATE_TRUNC('minute', startdate)
                ORDER BY DATE_TRUNC('minute', startdate)
                """,
            )

            zone_rows = _fetchall(
                cursor,
                f"""
                SELECT
                  LEFT(id, 1) AS zone,
                  COUNT(*) FILTER (WHERE status = 'active' AND occupied = 1) AS occupied,
                  COUNT(*) FILTER (WHERE status = 'active' AND occupied = 0) AS vacant
                FROM {TABLE_NAME}
                GROUP BY LEFT(id, 1)
                ORDER BY zone
                """,
            )

            turnover_rows = _fetchall(
                cursor,
                f"""
                SELECT id, COUNT(*) AS changes
                FROM {TABLE_NAME}
                GROUP BY id
                ORDER BY changes DESC, id
                LIMIT 7
                """,
            )
    except Exception as exc:
        logger.warning("Analytics query failed: %s", exc)
        return {"available": False, "error": str(exc)}
    finally:
        conn.close()

    return {
        "available": True,
        "summary": {
            "occupancy_pct": occupancy_pct,
            "occupied": int(occupied),
            "tracked_slots": int(tracked_slots),
            "total_events": int(total_events),
        },
        "traffic_by_minute": {
            "labels": [row[0] for row in traffic_rows],
            "entries": [int(row[1]) for row in traffic_rows],
            "exits": [int(row[2]) for row in traffic_rows],
        },
        "occupancy_by_zone": {
            "labels": [row[0] for row in zone_rows],
            "occupied": [int(row[1]) for row in zone_rows],
            "vacant": [int(row[2]) for row in zone_rows],
        },
        "slot_turnover": {
            "labels": [row[0] for row in turnover_rows],
            "changes": [int(row[1]) for row in turnover_rows],
        },
    }
