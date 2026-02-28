"""
DuckDB connection and filter helpers. Uses project config from parent.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import config
import duckdb


def get_connection():
    return duckdb.connect(config.DB_PATH, read_only=True)


def month_filter(
    table_alias: str,
    selected_years: list[str] | None,
    from_month: str | None,
    to_month: str | None,
) -> tuple[str, list]:
    """Build WHERE fragment and params for month/year filter. Use table_alias 't' or 'a' when query has JOINs to avoid ambiguous 'month'."""
    prefix = f"{table_alias}." if table_alias else ""
    parts, params = [], []
    if selected_years:
        placeholders = ",".join(["?" for _ in selected_years])
        parts.append(f"SUBSTR({prefix}month, 1, 4) IN ({placeholders})")
        params.extend(selected_years)
    if from_month:
        parts.append(f"{prefix}month >= ?")
        params.append(from_month)
    if to_month:
        parts.append(f"{prefix}month <= ?")
        params.append(to_month)
    where = " AND ".join(parts) if parts else "1=1"
    return where, params
