# Transparencia Ciudadana

Portal de transparencia de contratación pública con datos abiertos Guatecompras OCDS. Actualmente enfocado en **Municipalidad de Antigua Guatemala**; preparado para ampliarse a más municipios de Guatemala.

**Sitio:** [https://transparenciaciudadana.org](https://transparenciaciudadana.org)  
**Repositorio:** [github.com/Jacobog3/transparenciaciudadana](https://github.com/Jacobog3/transparenciaciudadana)

### Push to GitHub (first time)

From project root:

```bash
git init
git add .
git commit -m "Initial commit: Transparencia Ciudadana portal"
git branch -M main
git remote add origin https://github.com/Jacobog3/transparenciaciudadana.git
git push -u origin main
```

## Requirements

- **DuckDB** CLI (e.g. v1.4.4+): [duckdb.org](https://duckdb.org/)
- **jq**: for JSON → NDJSON conversion
- **Python 3.12**: for Streamlit app and scripts (see `requirements.txt`). 3.12 is the current standard for new projects.

## Data source

Monthly OCDS JSON from Guatecompras. Root object has `records[]`; each record has `ocid`, `compiledRelease` with `tender`, `buyer`, `awards`, etc.

## Project layout

```
├── app/                 # Streamlit app (legacy MVP)
├── backend/             # FastAPI API (DuckDB queries)
├── frontend/            # Next.js + shadcn-style UI (Spanish)
├── config.py            # Buyer name, paths
├── data/                # NDJSON, DuckDB, logs (gitignored)
│   └── logs/            # ingest.log (ingestion run log, rotated daily)
├── docs/                # CONTEXT.md, deploy notes
├── scripts/             # Ingestion (JSON→NDJSON, DuckDB load)
├── sql/                 # DuckDB schema and views
├── requirements.txt      # Python deps (Streamlit, etc.)
└── README.md
```

## Setup (use a venv)

Use **Python 3.12**. If `python3.12` is not found, install it first:

**macOS (Homebrew):**
```bash
brew install python@3.12
# Homebrew puts it in a versioned path; create venv with:
$(brew --prefix python@3.12)/bin/python3.12 -m venv .venv
```

**macOS/Linux — pyenv:** Run from the project root. Pyenv must be initialized in your shell so `python3` uses 3.12 here.
```bash
# 1. Install pyenv and add to shell: https://github.com/pyenv/pyenv#installation
#    Add to ~/.zshrc: eval "$(pyenv init -)"
# 2. Install Python and set it for this project
pyenv install 3.12
pyenv local 3.12
# 3. Create venv and install (python3 will be 3.12 if pyenv is active)
python3 -m venv .venv
source .venv/bin/activate
pip3 install -r requirements.txt
```
If `python3 --version` still shows 3.9, open a new terminal or run `eval "$(pyenv init -)"` so pyenv takes effect.

**Then** activate the venv and install: `source .venv/bin/activate` then `pip3 install -r requirements.txt` (Windows: `.venv\Scripts\activate`).

The project includes a `.venv` folder (gitignored). Run all Python commands with the venv activated. Use `python3` and `pip3` in commands (on many systems `python`/`pip` are not in PATH).

**Troubleshooting — "installed in .../Library/Python/3.9/bin" / "not on PATH":**  
That means `pip3 install` ran **without** the venv active, so packages went to your user Python 3.9. Do **not** add that directory to PATH. Fix: create the venv (see pyenv steps above), then run `source .venv/bin/activate` and only then `pip3 install -r requirements.txt`. After that, `which pip3` and `which streamlit` should point to `.venv/bin/`.

## Quick start

### Option A — Next.js + FastAPI (recommended)

1. **Data & DB:** Activate the venv, put monthly JSON in `data/`, run ingestion (see Option B steps 2–3).
2. **Backend:** From project root:
   ```bash
   source .venv/bin/activate
   pip3 install -r requirements.txt
   python3 -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```
3. **Frontend:** In another terminal (Node 18+ required):
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` in `.env` if the API runs on another host/port.

For mobile testing on the same Wi-Fi network:
```bash
cd frontend
npm run dev:lan
```
Then open `http://<IP-DE-TU-PC>:3000` on your phone. Keep backend running on `0.0.0.0:8000`.

### Option B — Streamlit (legacy)

1. Activate the venv (see Setup above).
2. Put a monthly JSON in `data/` (e.g. `data/2026-02_Guatecompras.json`).
3. Run ingestion for that month:
   ```bash
   ./scripts/ingest.sh 2026-02
   ```
4. Start the app:
   ```bash
   streamlit run app/app.py
   ```

## Ingestion logs

When you run `python scripts/ingest_all.py` or `python scripts/ingest.py YYYY-MM`, execution is logged to **`data/logs/ingest.log`** (and to the console). Use this to verify runs on a server and to see why a run failed.

- **Format:** `timestamp | level | logger | message`
- **Start/finish:** `INGEST_ALL_START` (parameters, how many months to process), `INGEST_ALL_FINISH` (status=success|failure, ingested count, duration_sec). For single-month runs: `INGEST_START`, `INGEST_FINISH`.
- **On failure:** Full error and traceback are written to the log; failed month and stderr are in `INGEST_ALL_FAILED` or in the exception block.
- **Rotation:** Log file rotates daily (backups kept 30 days). Path: `data/logs/ingest.log`; rotated files: `ingest.log.2026-02-27`, etc.

To monitor a running ingest: `tail -f data/logs/ingest.log`.

## Verifying the database (FastAPI uses lake.duckdb)

Ingestion writes to **`data/lake_next.duckdb`**. The FastAPI backend reads **`data/lake.duckdb`**. After a successful ingest you must do the atomic swap so the API sees the new data:

```bash
mv data/lake_next.duckdb data/lake.duckdb
```

To verify what is in the DB (row counts, buyers, modalities):

```bash
python scripts/check_db.py              # checks lake.duckdb (what the API uses)
python scripts/check_db.py lake_next.duckdb   # checks just-ingested data
```

If **Por modalidad** is empty but you ran ingest, run `check_db.py`: it will show whether the DB has rows, which buyer(s) are present, and whether `procurement_method_details` is populated. If the JSON did not contain the configured buyer (Antigua), tenders will be 0.

## Portal views and data

- **Por modalidad** shows procurement breakdown by procedure type (OCDS `procurementMethodDetails`; ingestion falls back to `procurementMethod` if details is null). This view will be **empty** if: (1) no DB exists or ingestion was never run, (2) you ingested but did not swap `lake_next.duckdb` → `lake.duckdb`, or (3) the ingested JSON does **not** contain records for the configured buyer (`config.BUYER_ANTIGUA`). The ingest script filters at insert time with `WHERE compiledRelease.buyer.name = ?`, so only records for that buyer are stored. Use a JSON file that includes Antigua’s records (e.g. from Guatecompras for that buyer or a full export that contains them).

## Deployment (making the portal public)

### Frontend (Next.js)

Deploy the `frontend/` app to a static/Node host. Recommended: **Vercel** (same team as Next.js):

1. Push the repo to GitHub/GitLab and import the project in [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = full URL of your API (e.g. `https://api.transparenciaciudadana.org`).
   - Optionally: `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GA_ADS_ID`, `NEXT_PUBLIC_GA_ADSENSE_CLIENT` (see below).
4. Deploy. Vercel will run `npm run build` and serve the app.

### Backend (FastAPI) and data

The API needs a server with Python, the `data/` folder (or equivalent path), and `lake.duckdb`. Options:

- **VPS (e.g. DigitalOcean, Linode):** Install Python, run ingestion on the server, then run `uvicorn backend.main:app --host 0.0.0.0 --port 8000` (or behind gunicorn + nginx). Point `NEXT_PUBLIC_API_URL` to this host. Ensure CORS allows your frontend origin (see `backend/main.py`).
- **Docker:** Add a `Dockerfile` that copies the backend and data, runs uvicorn. Mount or copy `data/lake.duckdb` into the container.
- **Serverless:** FastAPI can run on serverless (e.g. Google Cloud Run) if you provide DuckDB (e.g. from a bucket). More setup; usually a small VPS is simpler for a single DB file.

After deployment, run ingestion on a schedule (cron) and swap `lake_next.duckdb` → `lake.duckdb` so the live API serves fresh data.

## Google Analytics and Google Ads

The frontend can send traffic data to **Google Analytics 4 (GA4)** and **Google Ads** when the corresponding IDs are set. If they are not set, no script is loaded.
The site includes a cookie consent banner; tracking scripts are loaded only after user acceptance.

### Google Analytics 4

1. Create a GA4 property at [analytics.google.com](https://analytics.google.com).
2. In **Admin → Data Streams**, add a **Web** stream and copy the **Measurement ID** (format `G-XXXXXXXXXX`).
3. In your deployment (e.g. Vercel), add an environment variable:
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
4. Redeploy. Page views and events will appear in GA4 (may take a few hours for first data).

### Google Ads

1. In [Google Ads](https://ads.google.com), go to **Tools → Conversions** and create a conversion (e.g. “Visit transparency portal” or a specific action). Copy the **Conversion ID** (format `AW-XXXXXXXXXX`).
2. Add an environment variable in your deployment:
   - `NEXT_PUBLIC_GA_ADS_ID=AW-XXXXXXXXXX`
   - `NEXT_PUBLIC_GA_ADS_CONVERSION_LABEL=XXXXXXXXXXXXXXX` (conversion label)
3. If you will monetize with AdSense, also set:
   - `NEXT_PUBLIC_GA_ADSENSE_CLIENT=ca-pub-0000000000000000`
4. Redeploy. The gtag script will load both GA4 and Google Ads; you can use the same tag for conversion tracking and remarketing.
4. (Recommended) Configure `ADS_TXT_LINE` so `/ads.txt` serves your publisher line.
5. (Recommended) Add `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` with your Search Console token.

You can set only one, or both. Local development: leave the variables unset or omit them from `.env`; the portal works normally and no analytics script is injected.

## Branding and footer configuration

Optional frontend env vars (`frontend/.env`) for multi-municipality branding and professional footer contact:

- `NEXT_PUBLIC_MUNICIPALITY_NAME`
- `NEXT_PUBLIC_MUNICIPALITY_SHORT_NAME`
- `NEXT_PUBLIC_MUNICIPALITY_REGION`
- `NEXT_PUBLIC_MUNICIPALITY_TAGLINE`
- `NEXT_PUBLIC_MUNICIPALITY_ACCENT_COLOR`
- `NEXT_PUBLIC_SITE_LOGO_PATH`
- `NEXT_PUBLIC_MUNICIPALITY_LOGO_LIGHT_PATH`
- `NEXT_PUBLIC_MUNICIPALITY_LOGO_DARK_PATH`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL`

## Config

Edit `config.py` to change the target buyer or paths. Default buyer: `MUNICIPALIDAD DE ANTIGUA GUATEMALA, SACATEPÉQUEZ`.

## License

See repository or project terms.
