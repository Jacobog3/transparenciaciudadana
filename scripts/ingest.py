#!/usr/bin/env python3
"""
Ingest one month of Guatecompras OCDS: JSON -> NDJSON -> DuckDB.
Usage: python scripts/ingest.py 2026-02 [path_to_json]
  If path_to_json omitted, uses data/2026-02_Guatecompras.json
  Builds data/lake_next.duckdb (or appends if existing); atomic swap is separate.
  Logs to data/logs/ingest.log (and console).
"""
import os
import subprocess
import sys
import traceback

# Project root = parent of scripts/
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import config

# Import after path is set; use same pattern as ingest_all
from scripts.ingest_logging import setup_ingest_logging

logger = setup_ingest_logging("ingest.one")


def main() -> None:
    if len(sys.argv) < 2:
        logger.error("Usage: python scripts/ingest.py YYYY-MM [path_to_json]")
        sys.exit(1)
    month = sys.argv[1]
    json_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        config.DATA_DIR, f"{month}_Guatecompras.json"
    )
    ndjson_path = json_path.replace(".json", ".ndjson")
    os.makedirs(config.DATA_DIR, exist_ok=True)

    logger.info("INGEST_START month=%s json_path=%s", month, json_path)

    if not os.path.isfile(json_path):
        logger.error("JSON not found: %s", json_path)
        sys.exit(1)

    try:
        # JSON -> NDJSON
        logger.info("Converting %s -> NDJSON", json_path)
        with open(json_path, "rb") as f_in, open(ndjson_path, "w") as f_out:
            subprocess.run(["jq", "-c", ".records[]"], stdin=f_in, stdout=f_out, check=True)

        import duckdb
        db_path = config.DB_PATH_NEXT
        con = duckdb.connect(db_path)

        sql_dir = os.path.join(PROJECT_ROOT, "sql")
        with open(os.path.join(sql_dir, "schema.sql")) as f:
            con.execute(f.read())

        buyer = config.BUYER_ANTIGUA

        con.execute("BEGIN")
        try:
            con.execute("DELETE FROM tenders_clean_all WHERE month = ?", [month])
            con.execute("DELETE FROM awards_clean_all WHERE month = ?", [month])

            # procurement_method_details (OCDS) = modalidad in the portal; fallback to procurementMethod if details is null
            con.execute("""
            INSERT INTO tenders_clean_all
            SELECT
                ocid,
                compiledRelease.tender.id,
                compiledRelease.buyer.name,
                compiledRelease.tender.title,
                compiledRelease.tender.datePublished,
                COALESCE(compiledRelease.tender.procurementMethodDetails, compiledRelease.tender.procurementMethod),
                compiledRelease.tender.numberOfTenderers,
                compiledRelease.tender.status,
                compiledRelease.tender.statusDetails,
                ?
            FROM read_json_auto(?)
            WHERE compiledRelease.buyer.name = ?
        """, [month, ndjson_path, buyer])

            con.execute("""
            INSERT INTO awards_clean_all
            SELECT
                r.ocid,
                r.compiledRelease.tender.id,
                r.compiledRelease.buyer.name,
                r.compiledRelease.tender.title,
                unnest.id,
                unnest.date,
                unnest.value.amount,
                unnest.value.currency,
                unnest.suppliers[1].name,
                unnest.suppliers[1].id,
                ?
            FROM read_json_auto(?) r,
                 unnest(r.compiledRelease.awards)
            WHERE r.compiledRelease.buyer.name = ?
        """, [month, ndjson_path, buyer])

            con.execute("COMMIT")
        except Exception:
            con.execute("ROLLBACK")
            raise

        con.close()
        logger.info("INGEST_FINISH month=%s success=True db_path=%s", month, db_path)
    except subprocess.CalledProcessError as e:
        logger.error("jq failed: returncode=%s stderr=%s", e.returncode, e.stderr)
        raise
    except Exception:
        logger.exception("INGEST_FINISH month=%s success=False", month)
        raise


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(1)
