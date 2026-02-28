#!/usr/bin/env python3
"""
Run ingest for a range of months (JSON -> NDJSON -> DuckDB).
Usage: python scripts/ingest_all.py [--from-year 2024] [--to-year 2026] [--to-month 2]
  Default: 2024-01 through 2026-02. Writes to lake_next.duckdb; atomic swap is separate.
  Logs to data/logs/ingest.log (and console). On failure, full error is in the log.
"""
import argparse
import os
import subprocess
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import config
from scripts.ingest_logging import setup_ingest_logging

logger = setup_ingest_logging("ingest.all")


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest Guatecompras OCDS for a range of months")
    parser.add_argument("--from-year", type=int, default=2024)
    parser.add_argument("--to-year", type=int, default=2026)
    parser.add_argument("--to-month", type=int, default=None, metavar="M")
    args = parser.parse_args()

    months = []
    for y in range(args.from_year, args.to_year + 1):
        end_m = args.to_month if y == args.to_year and args.to_month is not None else 12
        for m in range(1, end_m + 1):
            months.append(f"{y}-{m:02d}")

    ingest_script = os.path.join(PROJECT_ROOT, "scripts", "ingest.py")
    to_process = [m for m in months if os.path.isfile(os.path.join(config.DATA_DIR, f"{m}_Guatecompras.json"))]
    skipped = len(months) - len(to_process)

    logger.info(
        "INGEST_ALL_START from_year=%s to_year=%s to_month=%s total_months=%s to_process=%s skipped=%s",
        args.from_year, args.to_year, args.to_month, len(months), len(to_process), skipped,
    )
    start_sec = time.time()
    ingested = 0

    try:
        for i, month in enumerate(months):
            json_path = os.path.join(config.DATA_DIR, f"{month}_Guatecompras.json")
            if not os.path.isfile(json_path):
                logger.debug("Skip month=%s reason=file_not_found path=%s", month, json_path)
                continue

            logger.info("Processing month=%s progress=%s/%s", month, i + 1, len(months))
            r = subprocess.run(
                [sys.executable, ingest_script, month],
                cwd=PROJECT_ROOT,
                capture_output=True,
                text=True,
                timeout=600,
            )

            if r.returncode != 0:
                logger.error(
                    "INGEST_ALL_FAILED month=%s returncode=%s stderr=%s",
                    month, r.returncode, (r.stderr or r.stdout or "(empty)").strip(),
                )
                sys.exit(1)
            ingested += 1

        duration_sec = round(time.time() - start_sec, 1)
        logger.info(
            "INGEST_ALL_FINISH status=success ingested=%s skipped=%s duration_sec=%s db_path=%s",
            ingested, skipped, duration_sec, config.DB_PATH_NEXT,
        )
        logger.info("Atomic swap when ready: mv data/lake_next.duckdb data/lake.duckdb")
    except subprocess.TimeoutExpired as e:
        logger.exception("INGEST_ALL_FAILED month=%s reason=timeout timeout=%s", e.cmd[-1] if e.cmd else "?", e.timeout)
        sys.exit(1)
    except Exception:
        logger.exception("INGEST_ALL_FINISH status=failure ingested=%s", ingested)
        sys.exit(1)


if __name__ == "__main__":
    main()
