#!/usr/bin/env bash
# Ingest one month. Usage: ./scripts/ingest.sh 2026-02 [path_to_json]
set -e
cd "$(dirname "$0")/.."
python scripts/ingest.py "$@"
