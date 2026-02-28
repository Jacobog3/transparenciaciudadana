-- Consolidated tables for transparency portal. Ingest script fills these from NDJSON.
-- buyer_name filter is applied at insert time (see scripts/ingest.py).

CREATE TABLE IF NOT EXISTS tenders_clean_all (
    ocid VARCHAR,
    nog VARCHAR,
    buyer_name VARCHAR,
    title VARCHAR,
    date_published VARCHAR,
    procurement_method_details VARCHAR,
    number_of_tenderers BIGINT,
    tender_status VARCHAR,
    tender_status_details VARCHAR,
    month VARCHAR
);

CREATE TABLE IF NOT EXISTS awards_clean_all (
    ocid VARCHAR,
    nog VARCHAR,
    buyer_name VARCHAR,
    title VARCHAR,
    award_id VARCHAR,
    award_date VARCHAR,
    amount DOUBLE,
    currency VARCHAR,
    supplier_name VARCHAR,
    supplier_id VARCHAR,
    month VARCHAR
);
