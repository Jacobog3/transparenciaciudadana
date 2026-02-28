#!/usr/bin/env python3
"""
Check DuckDB contents: row counts, buyers, modalities. Use to verify data after ingest.
The API uses data/lake.duckdb. Ingest writes to data/lake_next.duckdb; swap with:
  mv data/lake_next.duckdb data/lake.duckdb
Usage: python scripts/check_db.py [lake.duckdb|lake_next.duckdb]
  Default: lake.duckdb (what the FastAPI backend reads).
"""
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import config


def main() -> None:
    which = sys.argv[1] if len(sys.argv) > 1 else "lake.duckdb"
    if which == "lake_next.duckdb":
        path = config.DB_PATH_NEXT
    else:
        path = config.DB_PATH

    if not os.path.isfile(path):
        print(f"DB not found: {path}")
        print("Run ingestion first. After ingest, use lake.duckdb (API) or pass lake_next.duckdb to see just-ingested data.")
        sys.exit(1)

    import duckdb
    con = duckdb.connect(path, read_only=True)
    try:
        print(f"=== {path} ===\n")

        t_count = con.execute("SELECT COUNT(*) FROM tenders_clean_all").fetchone()[0]
        a_count = con.execute("SELECT COUNT(*) FROM awards_clean_all").fetchone()[0]
        print(f"tenders_clean_all: {t_count} rows")
        print(f"awards_clean_all:  {a_count} rows\n")

        if t_count == 0:
            print("No tenders. Ingest uses WHERE buyer.name = ? (Antigua). Ensure your JSON contains that buyer.")
            return

        buyers = con.execute(
            "SELECT DISTINCT buyer_name FROM tenders_clean_all ORDER BY 1"
        ).fetchall()
        print(f"Distinct buyer_name in tenders: {len(buyers)}")
        for (b,) in buyers:
            print(f"  - {b!r}")
        print()

        mods = con.execute("""
            SELECT COALESCE(procurement_method_details, '(null)') AS m, COUNT(*) AS c
            FROM tenders_clean_all
            GROUP BY procurement_method_details
            ORDER BY c DESC
            LIMIT 20
        """).fetchall()
        print("Modalidades (procurement_method_details) in tenders:")
        if not mods:
            print("  (none)")
        else:
            for (m, c) in mods:
                print(f"  {c:6}  {m!r}")
        print()

        months = con.execute(
            "SELECT DISTINCT month FROM tenders_clean_all WHERE month IS NOT NULL ORDER BY month"
        ).fetchall()
        print(f"Months in DB: {len(months)}")
        if months:
            print(f"  First: {months[0][0]}, Last: {months[-1][0]}")
    finally:
        con.close()

    if which == "lake_next.duckdb":
        print("\n(API reads lake.duckdb. To use this DB: mv data/lake_next.duckdb data/lake.duckdb)")


if __name__ == "__main__":
    main()
