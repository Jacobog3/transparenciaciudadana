#!/usr/bin/env python3
"""
Backup a data file before replacing it, so we never lose data.
Usage: python scripts/backup_before_replace.py <path_to_json>
  e.g. python scripts/backup_before_replace.py data/2026-02_Guatecompras.json
  Copies to data/backups/2026-02_Guatecompras_2026-02-26T14-30-00.json (if file exists).
Exit 0 if backup done or file did not exist; exit 1 on error.
"""
import os
import shutil
import sys
from datetime import datetime, timezone

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import config


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/backup_before_replace.py <path_to_json>", file=sys.stderr)
        sys.exit(1)
    path = os.path.normpath(sys.argv[1])
    if not os.path.isabs(path):
        path = os.path.join(PROJECT_ROOT, path)

    if not os.path.isfile(path):
        sys.exit(0)

    os.makedirs(config.BACKUPS_DIR, exist_ok=True)
    base = os.path.basename(path)
    name, ext = os.path.splitext(base)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    backup_name = f"{name}_{ts}{ext}"
    backup_path = os.path.join(config.BACKUPS_DIR, backup_name)

    try:
        shutil.copy2(path, backup_path)
        print(f"Backed up to {backup_path}")
    except Exception as e:
        print(f"Backup failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
