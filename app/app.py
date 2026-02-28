"""
Streamlit MVP: transparency portal for Antigua Guatemala.
Requires data/lake.duckdb (run ingest first, then atomic swap).
"""
import json
import os
import streamlit as st

# Add project root for config
sys_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if sys_path not in __import__("sys").path:
    __import__("sys").path.insert(0, sys_path)

import config

st.set_page_config(page_title="Transparencia — Antigua Guatemala", layout="wide")
st.title("Transparencia — Municipalidad de Antigua Guatemala")

# Data reference (for public attribution)
def _load_data_reference():
    if not os.path.isfile(config.MANIFEST_PATH):
        return None
    with open(config.MANIFEST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

ref = _load_data_reference()
if ref and ref.get("files"):
    files = ref["files"]
    downloaded_dates = [v.get("downloaded_at") for v in files.values() if v.get("downloaded_at")]
    package_dates = [v.get("package_published_date") for v in files.values() if v.get("package_published_date")]
    last_downloaded = max(downloaded_dates) if downloaded_dates else None
    if last_downloaded:
        from datetime import datetime
        try:
            dt = datetime.fromisoformat(last_downloaded.replace("Z", "+00:00"))
            last_downloaded_label = dt.strftime("%d/%m/%Y %H:%M UTC")
        except Exception:
            last_downloaded_label = last_downloaded
    else:
        last_downloaded_label = None
    with st.expander("Referencia de los datos", expanded=False):
        st.markdown(
            "**Fuente:** [Guatecompras OCDS](https://ocds.guatecompras.gt/) — Guatemala, Ministerio de Finanzas Públicas (DGAE). "
            "Datos publicados bajo estándar Open Contracting Data Standard (OCDS)."
        )
        if last_downloaded_label:
            st.markdown(f"**Última descarga de datos:** {last_downloaded_label}")
        if package_dates:
            min_pub = min(package_dates)
            max_pub = max(package_dates)
            st.markdown(f"**Fechas de publicación del paquete (fuente):** entre {min_pub[:10]} y {max_pub[:10]}.")
        st.caption(
            "Los datos mostrados corresponden únicamente a procesos de la Municipalidad de Antigua Guatemala (Sacatepéquez). "
            "Para auditoría de cambios en los paquetes, véase el registro en data/data_changelog.md."
        )

if not os.path.isfile(config.DB_PATH):
    st.warning(
        "No se encontró la base de datos. Ejecute la ingestión y el intercambio atómico "
        f"para que exista `{config.DB_PATH}`."
    )
    st.stop()

import duckdb
con = duckdb.connect(config.DB_PATH, read_only=True)

# --- Filters (sidebar) ---
months_available = con.execute(
    "SELECT DISTINCT month FROM tenders_clean_all WHERE month IS NOT NULL ORDER BY month"
).fetchall()
months_available = [r[0] for r in months_available]
years_available = sorted(set(m[:4] for m in months_available)) if months_available else []

st.sidebar.header("Filtros")
selected_years = st.sidebar.multiselect(
    "Año(s)",
    options=years_available,
    default=years_available,
    key="filter_years",
)
use_range = st.sidebar.checkbox("Limitar por rango de meses", value=False, key="use_range")
from_month = to_month = None
if use_range and months_available:
    from_month = st.sidebar.selectbox("Desde mes", months_available, key="from_month")
    to_month = st.sidebar.selectbox("Hasta mes", months_available, index=len(months_available) - 1, key="to_month")
    if from_month and to_month and from_month > to_month:
        from_month, to_month = to_month, from_month

# Build SQL filter fragments (for tenders: t.month / tenders_clean_all.month, for awards: a.month / awards_clean_all.month)
def month_filter(table_alias: str) -> tuple[str, list]:
    alias = f"{table_alias}." if table_alias else ""
    parts, params = [], []
    if selected_years:
        placeholders = ",".join(["?" for _ in selected_years])
        parts.append(f"SUBSTR({alias}month, 1, 4) IN ({placeholders})")
        params.extend(selected_years)
    if from_month:
        parts.append(f"{alias}month >= ?")
        params.append(from_month)
    if to_month:
        parts.append(f"{alias}month <= ?")
        params.append(to_month)
    where = " AND ".join(parts) if parts else "1=1"
    return where, params

wf_t, params_t = month_filter("")
wf_a, params_a = month_filter("")
# For JOINs: tender alias "t", award alias "a"
wf_t_alias = wf_t.replace("month", "t.month") if "month" in wf_t else wf_t
wf_a_alias = wf_a.replace("month", "a.month") if "month" in wf_a else wf_a

# Placeholder KPIs (filtered)
tenders_count = con.execute(
    f"SELECT COUNT(*) FROM tenders_clean_all WHERE {wf_t}", params_t
).fetchone()[0]
awards_count = con.execute(
    f"SELECT COUNT(*) FROM awards_clean_all WHERE {wf_a}", params_a
).fetchone()[0]
total_amount = con.execute(
    f"SELECT COALESCE(SUM(amount), 0) FROM awards_clean_all WHERE {wf_a}", params_a
).fetchone()[0]

filter_caption = f"Filtro: {', '.join(selected_years) if selected_years else 'todos los años'}"
if from_month or to_month:
    filter_caption += f" · {from_month or '?'} a {to_month or '?'}"
st.caption(filter_caption)

col1, col2, col3 = st.columns(3)
col1.metric("Procesos publicados", tenders_count)
col2.metric("Adjudicaciones", awards_count)
col3.metric("Total adjudicado", f"Q {total_amount:,.0f}")

# --- Observación ciudadana ---
st.subheader("Observación ciudadana")
st.markdown(
    "Estos datos permiten revisar **quién recibe las adjudicaciones** y si hay concentración en pocos proveedores. "
    "Una concentración muy alta (pocos proveedores con la mayoría del monto) puede merecer revisión o solicitud de información."
)
st.divider()

# By-supplier summary: who is getting the awards (filtered)
st.markdown("**Quién se lleva las adjudicaciones** (por monto total)")
df_suppliers = con.execute(f"""
    SELECT
        COALESCE(supplier_name, '(Sin nombre)') AS proveedor,
        COUNT(*) AS adjudicaciones,
        ROUND(SUM(amount), 2) AS total_q
    FROM awards_clean_all
    WHERE {wf_a}
    GROUP BY supplier_name
    ORDER BY total_q DESC
""", params_a).df()
if df_suppliers.empty:
    st.caption("No hay datos de adjudicaciones.")
else:
    st.dataframe(df_suppliers, use_container_width=True, column_config={
        "total_q": st.column_config.NumberColumn("Total (Q)", format="Q %.2f"),
        "adjudicaciones": st.column_config.NumberColumn("Adjudicaciones", format="%d"),
    })

# Concentration indicators (filtered)
total_q = float(total_amount)
distinct_suppliers = con.execute(
    f"SELECT COUNT(DISTINCT supplier_name) FROM awards_clean_all WHERE {wf_a}", params_a
).fetchone()[0]
top5_q = con.execute(f"""
    SELECT COALESCE(SUM(s.total_q), 0) FROM (
        SELECT SUM(amount) AS total_q
        FROM awards_clean_all
        WHERE {wf_a}
        GROUP BY supplier_name
        ORDER BY total_q DESC
        LIMIT 5
    ) s
""", params_a).fetchone()[0]
top5_pct = (float(top5_q) / total_q * 100) if total_q and total_q > 0 else 0

st.markdown("**Indicadores de concentración**")
c1, c2 = st.columns(2)
c1.metric("Proveedores distintos con adjudicaciones", distinct_suppliers)
c2.metric("Top 5 proveedores concentran", f"{top5_pct:.1f}% del total")

# Detail by supplier (filtered list and detail)
st.markdown("**Detalle por proveedor**")
supplier_names = con.execute(f"""
    SELECT DISTINCT COALESCE(supplier_name, '(Sin nombre)') AS name
    FROM awards_clean_all
    WHERE {wf_a}
    ORDER BY name
""", params_a).fetchall()
supplier_list = [r[0] for r in supplier_names]
if supplier_list:
    selected = st.selectbox("Seleccione un proveedor para ver todas sus adjudicaciones", supplier_list, key="supplier_select")
    # Map back to raw name for query (in case we used COALESCE)
    raw_name = None if selected == "(Sin nombre)" else selected
    if raw_name is None:
        df_detail = con.execute(f"""
            SELECT nog, title, award_date, amount, currency
            FROM awards_clean_all
            WHERE supplier_name IS NULL AND {wf_a}
            ORDER BY award_date DESC NULLS LAST
        """, params_a).df()
    else:
        p = params_a + [raw_name]
        wf_detail = f"{wf_a} AND supplier_name = ?"
        df_detail = con.execute(f"""
            SELECT nog, title, award_date, amount, currency
            FROM awards_clean_all
            WHERE {wf_detail}
            ORDER BY award_date DESC NULLS LAST
        """, p).df()
    if not df_detail.empty:
        st.dataframe(df_detail, use_container_width=True, column_config={
            "amount": st.column_config.NumberColumn("Monto (Q)", format="Q %.2f"),
        })
        st.caption("NOG = número de proceso en Guatecompras. Puede buscar el proceso en guatecompras.gt con ese número.")
    else:
        st.caption("Sin adjudicaciones para este proveedor.")
else:
    st.caption("No hay proveedores en los datos.")

# --- By procurement method (modalidad) ---
st.markdown("**Por modalidad de contratación**")
df_method = con.execute(f"""
    SELECT
        COALESCE(t.procurement_method_details, '(Sin especificar)') AS modalidad,
        COUNT(DISTINCT t.nog) AS procesos,
        ROUND(COALESCE(SUM(a.amount), 0), 2) AS total_q
    FROM tenders_clean_all t
    LEFT JOIN awards_clean_all a ON t.nog = a.nog AND t.month = a.month
    WHERE {wf_t_alias}
    GROUP BY t.procurement_method_details
    ORDER BY total_q DESC
""", params_t).df()
if not df_method.empty:
    st.dataframe(df_method, use_container_width=True, column_config={
        "total_q": st.column_config.NumberColumn("Total adjudicado (Q)", format="Q %.2f"),
        "procesos": st.column_config.NumberColumn("Procesos", format="%d"),
    })
    st.caption("Compras directas y excepciones a licitación pueden merecer revisión según la ley.")

    # Top suppliers per modality (same date filters)
    st.markdown("**Principales proveedores por modalidad**")
    df_top_suppliers_by_mod = con.execute(f"""
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
    """, params_t).df()
    if not df_top_suppliers_by_mod.empty:
        for mod in df_top_suppliers_by_mod["modalidad"].unique():
            sub = df_top_suppliers_by_mod[df_top_suppliers_by_mod["modalidad"] == mod].drop(columns=["modalidad", "rn"])
            with st.expander(f"**{mod}** — principales 10 por monto"):
                st.dataframe(sub, use_container_width=True, column_config={
                    "total_q": st.column_config.NumberColumn("Total (Q)", format="Q %.2f"),
                    "adjudicaciones": st.column_config.NumberColumn("Adjudicaciones", format="%d"),
                })
    else:
        st.caption("Sin datos de proveedores por modalidad para el filtro seleccionado.")
else:
    st.caption("Sin datos para el filtro seleccionado.")

# --- Procesos con 0 o 1 oferente ---
st.markdown("**Procesos con 0 o 1 oferente**")
low_comp = con.execute(f"""
    SELECT COUNT(*) FROM tenders_clean_all
    WHERE ({wf_t}) AND (number_of_tenderers IS NULL OR number_of_tenderers <= 1)
""", params_t).fetchone()[0]
st.metric("Procesos con poca competencia (0 o 1 oferente)", low_comp)
df_low = con.execute(f"""
    SELECT nog, title, procurement_method_details, number_of_tenderers, date_published, month
    FROM tenders_clean_all
    WHERE ({wf_t}) AND (number_of_tenderers IS NULL OR number_of_tenderers <= 1)
    ORDER BY date_published DESC NULLS LAST
    LIMIT 50
""", params_t).df()
if not df_low.empty:
    st.dataframe(df_low, use_container_width=True)
else:
    st.caption("Ninguno en el período seleccionado.")

# --- Amount bands (baja cuantía, compra directa, licitación) ---
st.markdown("**Adjudicaciones por rango de monto** (referencia: &lt; Q25k baja cuantía, Q25k–Q90k compra directa, &gt; Q90k licitación)")
df_bands = con.execute(f"""
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
""", params_a).df()
if not df_bands.empty:
    st.dataframe(df_bands, use_container_width=True, column_config={
        "total_q": st.column_config.NumberColumn("Total (Q)", format="Q %.2f"),
        "adjudicaciones": st.column_config.NumberColumn("Adjudicaciones", format="%d"),
    })
else:
    st.caption("Sin datos para el filtro seleccionado.")

# --- Trend by month ---
st.markdown("**Adjudicaciones por mes**")
df_trend = con.execute(f"""
    SELECT month AS mes, COUNT(*) AS adjudicaciones, ROUND(SUM(amount), 2) AS total_q
    FROM awards_clean_all
    WHERE {wf_a}
    GROUP BY month
    ORDER BY month
""", params_a).df()
if not df_trend.empty:
    st.bar_chart(df_trend.set_index("mes")["total_q"])
    st.dataframe(df_trend, use_container_width=True, column_config={
        "total_q": st.column_config.NumberColumn("Total (Q)", format="Q %.2f"),
    })
else:
    st.caption("Sin datos para el filtro seleccionado.")

st.divider()
st.subheader("Procesos")
df_tenders = con.execute(f"SELECT * FROM tenders_clean_all WHERE {wf_t} ORDER BY date_published DESC NULLS LAST LIMIT 100", params_t).df()
st.dataframe(df_tenders)

st.subheader("Adjudicaciones")
df_awards = con.execute(f"SELECT * FROM awards_clean_all WHERE {wf_a} ORDER BY award_date DESC NULLS LAST LIMIT 100", params_a).df()
st.dataframe(df_awards)

con.close()
