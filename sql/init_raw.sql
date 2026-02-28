-- Create raw view over NDJSON file. Run from DuckDB with variable set.
-- Usage (CLI): duckdb lake.duckdb -c ".read sql/init_raw.sql"  (after setting ndjson path)
-- Or from script: substitute :ndjson_path with actual path before running.

CREATE OR REPLACE VIEW raw AS
SELECT * FROM read_json_auto(:ndjson_path);
