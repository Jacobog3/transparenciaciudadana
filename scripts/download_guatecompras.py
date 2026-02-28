#!/usr/bin/env python3
"""
Download Guatecompras OCDS monthly JSON files with pauses between requests
to avoid rate limits or bot detection. For testing: 2024–2028 (current mayor term).

Usage:
  python scripts/download_guatecompras.py [--from-year 2024] [--to-year 2028] [--pause 15] [--dry-run]
  Default: 2024-01 through 2028-12, 15s pause between downloads.
  --dry-run: only print URLs, do not download.
  --pause: seconds between requests (default 15); add random 0–5s to avoid bot detection.
  The server returns a ZIP file containing the JSON (one member, e.g. 2024-01_Guatecompras.json).
  We extract that member and save as data/YYYY-MM_Guatecompras.json.
  HTTP 204: no content; do not overwrite. Before overwriting, runs backup_before_replace.
  Single instance: only one run at a time (lock file in data/). Second run exits with a clear message.
"""
import argparse
import atexit
import json
import os
import random
import signal
import subprocess
import sys
import time
import urllib.request
import zipfile
from datetime import datetime, timezone

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import config

LOCK_FILE = os.path.join(config.DATA_DIR, ".download_guatecompras.lock")


def _acquire_lock() -> None:
    """Ensure only one instance runs. Exit if another is running."""
    os.makedirs(config.DATA_DIR, exist_ok=True)
    if os.path.isfile(LOCK_FILE):
        try:
            with open(LOCK_FILE, "r") as f:
                pid = int(f.read().strip())
        except (ValueError, OSError):
            pid = None
        if pid is not None:
            try:
                os.kill(pid, 0)  # check if process exists
                print(
                    f"Another download is already running (PID {pid}). Exiting. "
                    f"If that process is gone, remove {LOCK_FILE} and retry.",
                    file=sys.stderr,
                )
                sys.exit(1)
            except OSError:
                pass  # process dead, stale lock
        try:
            os.remove(LOCK_FILE)
        except OSError:
            print(f"Cannot remove stale lock {LOCK_FILE}. Exiting.", file=sys.stderr)
            sys.exit(1)
    try:
        with open(LOCK_FILE, "w") as f:
            f.write(str(os.getpid()))
    except OSError as e:
        print(f"Cannot create lock file: {e}", file=sys.stderr)
        sys.exit(1)


def _release_lock() -> None:
    try:
        if os.path.isfile(LOCK_FILE):
            os.remove(LOCK_FILE)
    except OSError:
        pass


def _lock_cleanup() -> None:
    _release_lock()


# Register cleanup on normal exit and on SIGTERM/SIGINT
atexit.register(_lock_cleanup)
signal.signal(signal.SIGTERM, lambda s, f: (_release_lock(), sys.exit(0)))
signal.signal(signal.SIGINT, lambda s, f: (_release_lock(), sys.exit(0)))


def _record_downloaded_at(filename: str) -> None:
    """Record in manifest the date this file was downloaded (for public reference)."""
    manifest_path = config.MANIFEST_PATH
    if os.path.isfile(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"files": {}, "updated_at": None}
    if "files" not in data:
        data["files"] = {}
    entry = data["files"].get(filename, {})
    entry["downloaded_at"] = datetime.now(timezone.utc).isoformat()
    data["files"][filename] = entry
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    os.makedirs(config.DATA_DIR, exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def download_month(year: int, month: int, pause_sec: float, dry_run: bool) -> tuple[bool, str]:
    """Download one month. Returns (success, message)."""
    url = f"{config.GUATECOMPRAS_OCDS_JSON_BASE}/{year}/{month}"
    filename = f"{year}-{month:02d}_Guatecompras.json"
    path = os.path.join(config.DATA_DIR, filename)

    if dry_run:
        return True, f"DRY-RUN would GET {url} -> {filename}"

    os.makedirs(config.DATA_DIR, exist_ok=True)

    # Backup existing file before overwriting
    if os.path.isfile(path):
        r = subprocess.run(
            [sys.executable, os.path.join(PROJECT_ROOT, "scripts", "backup_before_replace.py"), path],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
        )
        if r.returncode != 0:
            return False, f"Backup failed: {r.stderr or r.stdout}"

    # Download to temp then move (avoid corrupt file if interrupted)
    tmp_path = path + ".tmp"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "TransparenciaCiudadana/1.0 (data transparency)"})
        with urllib.request.urlopen(req, timeout=300) as resp:
            code = resp.getcode()
            if code == 204:
                # No content in this response; do not overwrite. Manual download may still have data.
                return False, "204 No content (try manual download)"
            if code != 200:
                return False, f"HTTP {code}"
            size = 0
            with open(tmp_path, "wb") as f:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    size += len(chunk)
        if size == 0:
            if os.path.isfile(tmp_path):
                os.remove(tmp_path)
            return False, "Empty response body"
        # Server sends ZIP containing the JSON; extract and save as .json
        with open(tmp_path, "rb") as f:
            is_zip = f.read(2) == b"PK"
        if is_zip:
            with zipfile.ZipFile(tmp_path, "r") as z:
                names = [n for n in z.namelist() if n.endswith(".json")]
                if not names:
                    os.remove(tmp_path)
                    return False, "ZIP has no .json member"
                json_name = names[0]
                json_size = z.getinfo(json_name).file_size
                with z.open(json_name) as member:
                    with open(path, "wb") as out:
                        out.write(member.read())
            os.remove(tmp_path)
            _record_downloaded_at(filename)
            return True, f"OK (ZIP) {json_size / (1024*1024):.1f} MB"
        # Not ZIP: save as-is
        os.replace(tmp_path, path)
        _record_downloaded_at(filename)
        return True, f"OK {size / (1024*1024):.1f} MB"
    except urllib.error.HTTPError as e:
        if os.path.isfile(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        return False, f"HTTP {e.code} {e.reason}"
    except urllib.error.URLError as e:
        if os.path.isfile(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        return False, f"URL error: {e.reason}"
    except Exception as e:
        if os.path.isfile(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        return False, str(e)


def main() -> None:
    parser = argparse.ArgumentParser(description="Download Guatecompras OCDS monthly JSON (2024–2028, with pauses)")
    parser.add_argument("--from-year", type=int, default=2024, help="Start year (default 2024)")
    parser.add_argument("--to-year", type=int, default=2028, help="End year (default 2028)")
    parser.add_argument("--pause", type=float, default=15.0, help="Seconds between requests (default 15)")
    parser.add_argument("--dry-run", action="store_true", help="Only print URLs, do not download")
    parser.add_argument("--to-month", type=int, default=None, metavar="M", help="End month 1-12 (default: all 12). Use e.g. --to-year 2026 --to-month 2 to stop at 2026-02")
    args = parser.parse_args()

    if args.from_year > args.to_year:
        print("--from-year must be <= --to-year", file=sys.stderr)
        sys.exit(1)

    # Single instance: exit if another download is running
    if not args.dry_run:
        _acquire_lock()

    months = []
    for y in range(args.from_year, args.to_year + 1):
        end_m = args.to_month if y == args.to_year and args.to_month is not None else 12
        for m in range(1, end_m + 1):
            months.append((y, m))

    last_y, last_m = months[-1]
    print(f"Period: {args.from_year}-01 to {last_y}-{last_m:02d} ({len(months)} months)")
    print(f"Pause between requests: {args.pause}s" + (" (+ random 0–5s)" if not args.dry_run else ""))
    if args.dry_run:
        print("DRY-RUN: no files will be downloaded.")
    print()

    failed = []
    for i, (year, month) in enumerate(months):
        label = f"{year}-{month:02d}"
        ok, msg = download_month(year, month, args.pause, args.dry_run)
        print(f"[{i+1}/{len(months)}] {label}  {msg}")
        if not ok:
            failed.append((label, msg))
        if not args.dry_run and i < len(months) - 1:
            delay = args.pause + random.uniform(0, 5)
            time.sleep(delay)

    if failed:
        print("\n--- Failed ---")
        for label, msg in failed:
            print(f"  {label}: {msg}")
        sys.exit(1)
    print("\nAll done.")


if __name__ == "__main__":
    main()
