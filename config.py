"""
Project config: buyer filter and paths. Single source for app and scripts.
"""

import os

BUYER_ANTIGUA = "MUNICIPALIDAD DE ANTIGUA GUATEMALA, SACATEPÉQUEZ"

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
LOGS_DIR = os.path.join(DATA_DIR, "logs")
BACKUPS_DIR = os.path.join(DATA_DIR, "backups")
MANIFEST_PATH = os.path.join(DATA_DIR, "ingest_manifest.json")
CHANGELOG_PATH = os.path.join(DATA_DIR, "data_changelog.md")
DB_PATH = os.path.join(DATA_DIR, "lake.duckdb")
DB_PATH_NEXT = os.path.join(DATA_DIR, "lake_next.duckdb")

GUATECOMPRAS_BASE_URL = "https://www.guatecompras.gt"
GUATECOMPRAS_OCDS_JSON_BASE = "https://ocds.guatecompras.gt/file/json"
