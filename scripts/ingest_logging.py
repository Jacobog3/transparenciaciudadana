"""
Shared logging setup for ingest scripts. Writes to data/logs/ingest.log with daily rotation.
"""
import logging
import os
import sys
from logging.handlers import TimedRotatingFileHandler

# Allow running from project root (scripts/ingest.py) or as module
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import config  # noqa: E402


def setup_ingest_logging(name: str = "ingest") -> logging.Logger:
    """Configure and return a logger that writes to data/logs/ingest.log (and console)."""
    os.makedirs(config.LOGS_DIR, exist_ok=True)
    log_path = os.path.join(config.LOGS_DIR, "ingest.log")

    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # File: rotate at midnight, keep 30 days
    fh = TimedRotatingFileHandler(
        log_path,
        when="midnight",
        interval=1,
        backupCount=30,
        encoding="utf-8",
    )
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(formatter)
    fh.suffix = "%Y-%m-%d"
    logger.addHandler(fh)

    # Console: INFO only
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    return logger
