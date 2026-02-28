#!/usr/bin/env python3
"""
Update ingest manifest and mark changes in the data changelog (audit trail for
possible alteration of public information).
Usage:
  python scripts/update_manifest_and_changelog.py [path_to_json ...]
  If paths given: update manifest for those files; if change detected, append to
  data_changelog.md and add to change_history in manifest.
  If no paths: scan data/*_Guatecompras.json and refresh manifest (changelog
  only when previous state differed).
"""
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import config

# First occurrence in root is the package publishedDate (OCDS)
PUBLISHED_DATE_RE = re.compile(rb'"publishedDate"\s*:\s*"([^"]+)"')


def get_package_published_date(path: str) -> str | None:
    """Read first 8KB of file and extract first publishedDate (package-level)."""
    with open(path, "rb") as f:
        head = f.read(8192)
    m = PUBLISHED_DATE_RE.search(head)
    return m.group(1).decode("utf-8") if m else None


def get_content_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest() -> dict:
    if not os.path.isfile(config.MANIFEST_PATH):
        return {"files": {}, "updated_at": None}
    with open(config.MANIFEST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_manifest(data: dict) -> None:
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    os.makedirs(config.DATA_DIR, exist_ok=True)
    with open(config.MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def append_changelog_entry(
    file_key: str,
    previous_published: str | None,
    new_published: str,
    backup_file: str | None,
) -> None:
    """Append one entry to data_changelog.md (audit trail for alterations)."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    with open(config.CHANGELOG_PATH, "a", encoding="utf-8") as f:
        f.write("\n## Cambio detectado\n\n")
        f.write(f"- **Archivo:** `{file_key}`\n")
        f.write(f"- **Fecha de detección:** {now}\n")
        f.write(f"- **Nueva fecha de publicación del paquete (fuente):** {new_published}\n")
        if previous_published:
            f.write(f"- **Fecha de publicación anterior (paquete):** {previous_published}\n")
        if backup_file:
            f.write(f"- **Respaldo de la versión anterior:** `data/backups/{backup_file}`\n")
        f.write(
            "\n> Se registra este cambio para transparencia y posible alteración de información pública.\n"
        )


def ensure_changelog_header() -> None:
    if not os.path.isfile(config.CHANGELOG_PATH):
        os.makedirs(config.DATA_DIR, exist_ok=True)
        with open(config.CHANGELOG_PATH, "w", encoding="utf-8") as f:
            f.write("# Registro de cambios en los datos (Guatecompras OCDS)\n\n")
            f.write(
                "Este archivo registra cuándo se detectan nuevas versiones de los paquetes mensuales, "
                "para auditoría y transparencia ante posibles alteraciones de información pública.\n"
            )


def process_file(manifest: dict, path: str, file_key: str, backup_file: str | None) -> None:
    published = get_package_published_date(path)
    if not published:
        print(f"  {file_key}: no package publishedDate found", file=sys.stderr)
        return
    sha = get_content_sha256(path)
    now_iso = datetime.now(timezone.utc).isoformat()

    prev = manifest["files"].get(file_key, {})
    prev_published = prev.get("package_published_date")
    prev_sha = prev.get("content_sha256")

    changed = (prev_published is not None and prev_published != published) or (
        prev_sha is not None and prev_sha != sha
    )
    base_entry = {
        "content_sha256": sha,
        "package_published_date": published,
        "last_checked_at": now_iso,
        "downloaded_at": prev.get("downloaded_at"),  # preserve; set by download script
    }
    if changed:
        ensure_changelog_header()
        append_changelog_entry(file_key, prev_published, published, backup_file)
        manifest["files"][file_key] = {
            **base_entry,
            "change_history": prev.get("change_history", []) + [
                {
                    "detected_at": now_iso,
                    "previous_published_date": prev_published,
                    "new_published_date": published,
                    "backup_file": backup_file,
                }
            ],
        }
        print(f"  {file_key}: change recorded (was {prev_published} -> {published})")
    else:
        manifest["files"][file_key] = {
            **base_entry,
            "change_history": prev.get("change_history", []),
        }
        if prev_published is None:
            print(f"  {file_key}: initial state recorded")
        else:
            print(f"  {file_key}: no change")


def main() -> None:
    if len(sys.argv) > 1:
        paths = [os.path.normpath(p) for p in sys.argv[1:]]
        for i, p in enumerate(paths):
            if not os.path.isabs(p):
                paths[i] = os.path.join(PROJECT_ROOT, p)
    else:
        import glob
        pattern = os.path.join(config.DATA_DIR, "*_Guatecompras.json")
        paths = [p for p in glob.glob(pattern) if " " not in os.path.basename(p)]

    if not paths:
        print("No JSON files to process.", file=sys.stderr)
        sys.exit(0)

    manifest = load_manifest()
    for path in paths:
        if not os.path.isfile(path):
            print(f"Skip (not a file): {path}", file=sys.stderr)
            continue
        file_key = os.path.basename(path)
        # Optional: detect backup filename if we just replaced (e.g. latest in backups/)
        backup_file = None
        if config.BACKUPS_DIR and os.path.isdir(config.BACKUPS_DIR):
            prefix = file_key.replace(".json", "")
            candidates = [
                f
                for f in os.listdir(config.BACKUPS_DIR)
                if f.startswith(prefix) and f.endswith(".json")
            ]
            if candidates:
                candidates.sort(reverse=True)
                backup_file = candidates[0]
        process_file(manifest, path, file_key, backup_file)
    save_manifest(manifest)
    print(f"Manifest saved to {config.MANIFEST_PATH}")


if __name__ == "__main__":
    main()
