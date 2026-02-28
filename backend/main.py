"""
FastAPI backend for transparency portal. Serves DuckDB data for Next.js frontend.
Run from project root: uvicorn backend.main:app --reload
"""
import json
import logging
import os
import sys
from typing import Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import config
from backend.db import get_connection, month_filter

app = FastAPI(title="Transparencia Antigua API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://transparenciaciudadana.org",
        "https://www.transparenciaciudadana.org",
        "https://transparenciaciudadana.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _wf_params(
    years: list[str] | None = None,
    from_month: str | None = None,
    to_month: str | None = None,
):
    wf_t, params_t = month_filter("", years, from_month, to_month)
    wf_a, params_a = month_filter("", years, from_month, to_month)
    wf_t_alias, _ = month_filter("t", years, from_month, to_month)
    wf_a_alias, _ = month_filter("a", years, from_month, to_month)
    return wf_t, params_t, wf_a, params_a, wf_t_alias, wf_a_alias


@app.get("/api/diagnostic")
def get_diagnostic():
    """
    Lightweight DB check for debugging empty views (e.g. Por modalidad).
    Same DB as Streamlit used: data/lake.duckdb. Ingest writes to lake_next.duckdb; swap to lake.duckdb so API sees data.
    """
    out = {
        "db_path": config.DB_PATH,
        "db_exists": os.path.isfile(config.DB_PATH),
        "tenders_count": 0,
        "awards_count": 0,
        "distinct_modalities_count": 0,
        "buyer_names": [],
    }
    if not out["db_exists"]:
        return out
    try:
        con = get_connection()
        try:
            out["tenders_count"] = con.execute("SELECT COUNT(*) FROM tenders_clean_all").fetchone()[0]
            out["awards_count"] = con.execute("SELECT COUNT(*) FROM awards_clean_all").fetchone()[0]
            out["distinct_modalities_count"] = con.execute(
                "SELECT COUNT(DISTINCT COALESCE(procurement_method_details, '(null)')) FROM tenders_clean_all"
            ).fetchone()[0]
            out["buyer_names"] = [r[0] for r in con.execute("SELECT DISTINCT buyer_name FROM tenders_clean_all").fetchall()]
        finally:
            con.close()
    except Exception as e:
        logger.exception("diagnostic failed: %s", e)
    return out


@app.get("/api/filters")
def get_filters():
    """Available months and years for filter dropdowns."""
    if not os.path.isfile(config.DB_PATH):
        return {"months": [], "years": []}
    con = get_connection()
    try:
        months = [
            r[0]
            for r in con.execute(
                "SELECT DISTINCT month FROM tenders_clean_all WHERE month IS NOT NULL ORDER BY month"
            ).fetchall()
        ]
        years = sorted(set(m[:4] for m in months)) if months else []
        return {"months": months, "years": years}
    finally:
        con.close()


@app.get("/api/kpis")
def get_kpis(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
):
    wf_t, params_t, wf_a, params_a, _, _ = _wf_params(years, from_month, to_month)
    con = get_connection()
    try:
        tenders_count = con.execute(
            f"SELECT COUNT(*) FROM tenders_clean_all WHERE {wf_t}", params_t
        ).fetchone()[0]
        awards_count = con.execute(
            f"SELECT COUNT(*) FROM awards_clean_all WHERE {wf_a}", params_a
        ).fetchone()[0]
        total_amount = con.execute(
            f"SELECT COALESCE(SUM(amount), 0) FROM awards_clean_all WHERE {wf_a}",
            params_a,
        ).fetchone()[0]
        return {
            "tenders_count": tenders_count,
            "awards_count": awards_count,
            "total_amount": float(total_amount),
        }
    finally:
        con.close()


@app.get("/api/summary-by-year")
def get_summary_by_year():
    """Aggregate tenders count, awards count, total amount per year (no filter)."""
    if not os.path.isfile(config.DB_PATH):
        return []
    con = get_connection()
    try:
        rows = con.execute(
            """
            WITH years AS (
                SELECT DISTINCT SUBSTR(month, 1, 4) AS year FROM tenders_clean_all WHERE month IS NOT NULL
            ),
            t_counts AS (
                SELECT SUBSTR(month, 1, 4) AS year, COUNT(DISTINCT nog) AS tenders_count
                FROM tenders_clean_all WHERE month IS NOT NULL GROUP BY 1
            ),
            a_counts AS (
                SELECT SUBSTR(month, 1, 4) AS year, COUNT(*) AS awards_count, COALESCE(SUM(amount), 0) AS total_amount
                FROM awards_clean_all WHERE month IS NOT NULL GROUP BY 1
            )
            SELECT y.year, COALESCE(t.tenders_count, 0), COALESCE(a.awards_count, 0), ROUND(COALESCE(a.total_amount, 0), 2)
            FROM years y
            LEFT JOIN t_counts t ON y.year = t.year
            LEFT JOIN a_counts a ON y.year = a.year
            ORDER BY COALESCE(a.total_amount, 0) DESC, y.year DESC
            """
        ).fetchall()
        return [
            {"year": r[0], "tenders_count": r[1], "awards_count": r[2], "total_amount": float(r[3])}
            for r in rows
        ]
    finally:
        con.close()


@app.get("/api/suppliers")
def get_suppliers(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
):
    _, _, wf_a, params_a, _, _ = _wf_params(years, from_month, to_month)
    con = get_connection()
    try:
        rows = con.execute(
            f"""
            SELECT
                COALESCE(supplier_name, '(Sin nombre)') AS proveedor,
                COUNT(*) AS adjudicaciones,
                ROUND(SUM(amount), 2) AS total_q
            FROM awards_clean_all
            WHERE {wf_a}
            GROUP BY supplier_name
            ORDER BY total_q DESC
            """,
            params_a,
        ).fetchall()
        return [
            {"proveedor": r[0], "adjudicaciones": r[1], "total_q": float(r[2])}
            for r in rows
        ]
    finally:
        con.close()


@app.get("/api/concentration")
def get_concentration(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
):
    _, _, wf_a, params_a, _, _ = _wf_params(years, from_month, to_month)
    con = get_connection()
    try:
        total_q = con.execute(
            f"SELECT COALESCE(SUM(amount), 0) FROM awards_clean_all WHERE {wf_a}",
            params_a,
        ).fetchone()[0]
        total_q = float(total_q)
        distinct_suppliers = con.execute(
            f"SELECT COUNT(DISTINCT supplier_name) FROM awards_clean_all WHERE {wf_a}",
            params_a,
        ).fetchone()[0]
        top5_q = con.execute(
            f"""
            SELECT COALESCE(SUM(s.total_q), 0) FROM (
                SELECT SUM(amount) AS total_q
                FROM awards_clean_all
                WHERE {wf_a}
                GROUP BY supplier_name
                ORDER BY total_q DESC
                LIMIT 5
            ) s
            """,
            params_a,
        ).fetchone()[0]
        top5_pct = (float(top5_q) / total_q * 100) if total_q and total_q > 0 else 0
        return {
            "distinct_suppliers": distinct_suppliers,
            "top5_pct": round(top5_pct, 1),
        }
    finally:
        con.close()


@app.get("/api/supplier-names")
def get_supplier_names(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
):
    _, _, wf_a, params_a, _, _ = _wf_params(years, from_month, to_month)
    con = get_connection()
    try:
        rows = con.execute(
            f"""
            SELECT DISTINCT COALESCE(supplier_name, '(Sin nombre)') AS name
            FROM awards_clean_all
            WHERE {wf_a}
            ORDER BY name
            """,
            params_a,
        ).fetchall()
        return [r[0] for r in rows]
    finally:
        con.close()


@app.get("/api/supplier-detail")
def get_supplier_detail(
    supplier: str,
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
):
    _, _, wf_a, params_a, _, _ = _wf_params(years, from_month, to_month)
    raw_name = None if supplier == "(Sin nombre)" else supplier
    con = get_connection()
    try:
        if raw_name is None:
            wf = f"{wf_a} AND supplier_name IS NULL"
            params = list(params_a)
        else:
            wf = f"{wf_a} AND supplier_name = ?"
            params = list(params_a) + [raw_name]
        rows = con.execute(
            f"""
            SELECT nog, title, award_date, amount, currency
            FROM awards_clean_all
            WHERE {wf}
            ORDER BY award_date DESC NULLS LAST
            """,
            params,
        ).fetchall()
        return [
            {
                "nog": r[0],
                "title": r[1],
                "award_date": r[2],
                "amount": float(r[3]) if r[3] is not None else None,
                "currency": r[4],
            }
            for r in rows
        ]
    finally:
        con.close()


def _resolve_years(con, years: list[str] | None) -> list[str]:
    """If years is None or empty, return distinct years from tenders_clean_all so queries always have a valid filter."""
    if years:
        return years
    try:
        rows = con.execute(
            "SELECT DISTINCT SUBSTR(month, 1, 4) AS y FROM tenders_clean_all WHERE month IS NOT NULL ORDER BY y"
        ).fetchall()
        return [r[0] for r in rows] if rows else []
    except Exception:
        return []


@app.get("/api/modalities")
def get_modalities(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
):
    if not os.path.isfile(config.DB_PATH):
        return []
    try:
        con = get_connection()
        try:
            resolved_years = _resolve_years(con, years)
            _, params_t, _, _, wf_t_alias, _ = _wf_params(resolved_years, from_month, to_month)
            rows = con.execute(
                f"""
                SELECT
                    COALESCE(t.procurement_method_details, '(Sin especificar)') AS modalidad,
                    COUNT(DISTINCT t.nog) AS procesos,
                    ROUND(COALESCE(SUM(a.amount), 0), 2) AS total_q
                FROM tenders_clean_all t
                LEFT JOIN awards_clean_all a ON t.nog = a.nog AND t.month = a.month
                WHERE {wf_t_alias}
                GROUP BY t.procurement_method_details
                ORDER BY total_q DESC
                """,
                params_t,
            ).fetchall()
            return [
                {"modalidad": r[0], "procesos": r[1], "total_q": float(r[2])}
                for r in rows
            ]
        finally:
            con.close()
    except Exception as e:
        logger.exception("get_modalities failed: %s", e)
        return []


@app.get("/api/top-suppliers-by-modality")
def get_top_suppliers_by_modality(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
):
    if not os.path.isfile(config.DB_PATH):
        return []
    try:
        con = get_connection()
        try:
            resolved_years = _resolve_years(con, years)
            _, params_t, _, _, wf_t_alias, _ = _wf_params(resolved_years, from_month, to_month)
            rows = con.execute(
                f"""
                WITH by_mod_supplier AS (
                    SELECT
                        COALESCE(t.procurement_method_details, '(Sin especificar)') AS modalidad,
                        COALESCE(a.supplier_name, '(Sin nombre)') AS proveedor,
                        ROUND(SUM(a.amount), 2) AS total_q,
                        COUNT(*) AS adjudicaciones
                    FROM tenders_clean_all t
                    JOIN awards_clean_all a ON t.nog = a.nog AND t.month = a.month
                    WHERE {wf_t_alias}
                    GROUP BY t.procurement_method_details, a.supplier_name
                ),
                ranked AS (
                    SELECT *, ROW_NUMBER() OVER (PARTITION BY modalidad ORDER BY total_q DESC) AS rn
                    FROM by_mod_supplier
                )
                SELECT modalidad, proveedor, total_q, adjudicaciones, rn
                FROM ranked
                WHERE rn <= 10
                ORDER BY modalidad, rn
                """,
                params_t,
            ).fetchall()
            return [
                {
                    "modalidad": r[0],
                    "proveedor": r[1],
                    "total_q": float(r[2]),
                    "adjudicaciones": r[3],
                    "rn": r[4],
                }
                for r in rows
            ]
        finally:
            con.close()
    except Exception as e:
        logger.exception("get_top_suppliers_by_modality failed: %s", e)
        return []


@app.get("/api/low-competition")
def get_low_competition(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
):
    wf_t, params_t, _, _, _, _ = _wf_params(years, from_month, to_month)
    con = get_connection()
    try:
        count = con.execute(
            f"""
            SELECT COUNT(*) FROM tenders_clean_all
            WHERE ({wf_t}) AND (number_of_tenderers IS NULL OR number_of_tenderers <= 1)
            """,
            params_t,
        ).fetchone()[0]
        rows = con.execute(
            f"""
            SELECT nog, title, procurement_method_details, number_of_tenderers, date_published, month
            FROM tenders_clean_all
            WHERE ({wf_t}) AND (number_of_tenderers IS NULL OR number_of_tenderers <= 1)
            ORDER BY date_published DESC NULLS LAST
            LIMIT 50
            """,
            params_t,
        ).fetchall()
        return {
            "count": count,
            "tenders": [
                {
                    "nog": r[0],
                    "title": r[1],
                    "procurement_method_details": r[2],
                    "number_of_tenderers": r[3],
                    "date_published": r[4],
                    "month": r[5],
                }
                for r in rows
            ],
        }
    finally:
        con.close()


@app.get("/api/bands")
def get_bands(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
):
    _, _, wf_a, params_a, _, _ = _wf_params(years, from_month, to_month)
    con = get_connection()
    try:
        rows = con.execute(
            f"""
            SELECT
                CASE
                    WHEN amount < 25000 THEN '< Q25,000 (baja cuantía)'
                    WHEN amount < 90000 THEN 'Q25,000 - Q90,000 (compra directa)'
                    ELSE '> Q90,000 (licitación)'
                END AS rango,
                COUNT(*) AS adjudicaciones,
                ROUND(SUM(amount), 2) AS total_q
            FROM awards_clean_all
            WHERE {wf_a}
            GROUP BY 1
            ORDER BY MIN(amount)
            """,
            params_a,
        ).fetchall()
        return [
            {"rango": r[0], "adjudicaciones": r[1], "total_q": float(r[2])}
            for r in rows
        ]
    finally:
        con.close()


@app.get("/api/trend")
def get_trend(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
):
    _, _, wf_a, params_a, _, _ = _wf_params(years, from_month, to_month)
    con = get_connection()
    try:
        rows = con.execute(
            f"""
            SELECT month AS mes, COUNT(*) AS adjudicaciones, ROUND(SUM(amount), 2) AS total_q
            FROM awards_clean_all
            WHERE {wf_a}
            GROUP BY month
            ORDER BY month
            """,
            params_a,
        ).fetchall()
        return [
            {"mes": r[0], "adjudicaciones": r[1], "total_q": float(r[2])}
            for r in rows
        ]
    finally:
        con.close()


@app.get("/api/tenders")
def get_tenders(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
    limit: int = Query(100, le=500),
):
    wf_t, params_t, _, _, _, _ = _wf_params(years, from_month, to_month)
    params_t = list(params_t) + [limit]
    con = get_connection()
    try:
        rows = con.execute(
            f"SELECT * FROM tenders_clean_all WHERE {wf_t} ORDER BY date_published DESC NULLS LAST LIMIT ?",
            params_t,
        ).fetchall()
        cols = [d[0] for d in con.description]
        return [dict(zip(cols, r)) for r in rows]
    finally:
        con.close()


@app.get("/api/awards")
def get_awards(
    years: list[str] | None = Query(None, alias="years"),
    from_month: str | None = None,
    to_month: str | None = None,
    limit: int = Query(100, le=500),
):
    _, _, wf_a, params_a, _, _ = _wf_params(years, from_month, to_month)
    params_a = list(params_a) + [limit]
    con = get_connection()
    try:
        rows = con.execute(
            f"SELECT * FROM awards_clean_all WHERE {wf_a} ORDER BY award_date DESC NULLS LAST LIMIT ?",
            params_a,
        ).fetchall()
        cols = [d[0] for d in con.description]
        return [dict(zip(cols, r)) for r in rows]
    finally:
        con.close()


@app.get("/api/data-reference")
def get_data_reference():
    """Manifest info for data attribution."""
    if not os.path.isfile(config.MANIFEST_PATH):
        return {}
    with open(config.MANIFEST_PATH, "r", encoding="utf-8") as f:
        ref = json.load(f)
    if not ref.get("files"):
        return {}
    files = ref["files"]
    downloaded_dates = [v.get("downloaded_at") for v in files.values() if v.get("downloaded_at")]
    package_dates = [v.get("package_published_date") for v in files.values() if v.get("package_published_date")]
    last_downloaded = max(downloaded_dates) if downloaded_dates else None
    from datetime import datetime
    try:
        dt = datetime.fromisoformat(last_downloaded.replace("Z", "+00:00"))
        last_downloaded_label = dt.strftime("%d/%m/%Y %H:%M UTC")
    except Exception:
        last_downloaded_label = last_downloaded or ""
    min_pub = min(package_dates)[:10] if package_dates else ""
    max_pub = max(package_dates)[:10] if package_dates else ""
    return {
        "last_downloaded": last_downloaded_label,
        "package_date_range": f"{min_pub} — {max_pub}" if min_pub else "",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
