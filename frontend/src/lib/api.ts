const localHostPattern = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

function resolveApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window === "undefined") return "http://127.0.0.1:8000";
  const host = window.location.hostname;
  if (localHostPattern.test(host)) {
    return `http://${host}:8000`;
  }
  return "http://127.0.0.1:8000";
}

const API_BASE = resolveApiBase();

export type FilterParams = {
  years?: string[];
  from_month?: string;
  to_month?: string;
};

function searchParams(p: FilterParams): string {
  const q = new URLSearchParams();
  if (p.years?.length) p.years.forEach((y) => q.append("years", y));
  if (p.from_month) q.set("from_month", p.from_month);
  if (p.to_month) q.set("to_month", p.to_month);
  return q.toString();
}

export async function fetchFilters() {
  try {
    const r = await fetch(`${API_BASE}/api/filters`);
    if (!r.ok) return { months: [], years: [] };
    return r.json() as Promise<{ months: string[]; years: string[] }>;
  } catch {
    return { months: [], years: [] };
  }
}

export type Diagnostic = {
  db_path: string;
  db_exists: boolean;
  tenders_count: number;
  awards_count: number;
  distinct_modalities_count: number;
  buyer_names: string[];
};

export async function fetchDiagnostic() {
  const r = await fetch(`${API_BASE}/api/diagnostic`);
  if (!r.ok) throw new Error("Failed to fetch diagnostic");
  return r.json() as Promise<Diagnostic>;
}

export async function fetchKpis(params: FilterParams) {
  const q = searchParams(params);
  const r = await fetch(`${API_BASE}/api/kpis?${q}`);
  if (!r.ok) throw new Error("Failed to fetch KPIs");
  return r.json() as Promise<{
    tenders_count: number;
    awards_count: number;
    total_amount: number;
  }>;
}

export async function fetchSuppliers(params: FilterParams) {
  const q = searchParams(params);
  const r = await fetch(`${API_BASE}/api/suppliers?${q}`);
  if (!r.ok) throw new Error("Failed to fetch suppliers");
  return r.json() as Promise<{ proveedor: string; adjudicaciones: number; total_q: number }[]>;
}

export async function fetchConcentration(params: FilterParams) {
  const q = searchParams(params);
  const r = await fetch(`${API_BASE}/api/concentration?${q}`);
  if (!r.ok) throw new Error("Failed to fetch concentration");
  return r.json() as Promise<{ distinct_suppliers: number; top5_pct: number }>;
}

export async function fetchSupplierNames(params: FilterParams) {
  const q = searchParams(params);
  const r = await fetch(`${API_BASE}/api/supplier-names?${q}`);
  if (!r.ok) throw new Error("Failed to fetch supplier names");
  return r.json() as Promise<string[]>;
}

export async function fetchSupplierDetail(supplier: string, params: FilterParams) {
  const q = searchParams(params);
  const r = await fetch(`${API_BASE}/api/supplier-detail?supplier=${encodeURIComponent(supplier)}&${q}`);
  if (!r.ok) throw new Error("Failed to fetch supplier detail");
  return r.json() as Promise<
    { nog: string; title: string; award_date: string | null; amount: number | null; currency: string | null }[]
  >;
}

export async function fetchModalities(params: FilterParams) {
  const q = searchParams(params);
  const r = await fetch(`${API_BASE}/api/modalities?${q}`);
  if (!r.ok) throw new Error("Failed to fetch modalities");
  return r.json() as Promise<{ modalidad: string; procesos: number; total_q: number }[]>;
}

export async function fetchTopSuppliersByModality(params: FilterParams) {
  const q = searchParams(params);
  const r = await fetch(`${API_BASE}/api/top-suppliers-by-modality?${q}`);
  if (!r.ok) throw new Error("Failed to fetch top suppliers by modality");
  return r.json() as Promise<
    { modalidad: string; proveedor: string; total_q: number; adjudicaciones: number; rn: number }[]
  >;
}

export async function fetchLowCompetition(params: FilterParams) {
  const q = searchParams(params);
  const r = await fetch(`${API_BASE}/api/low-competition?${q}`);
  if (!r.ok) throw new Error("Failed to fetch low competition");
  return r.json() as Promise<{
    count: number;
    tenders: {
      nog: string;
      title: string;
      procurement_method_details: string | null;
      number_of_tenderers: number | null;
      date_published: string | null;
      month: string | null;
    }[];
  }>;
}

export async function fetchBands(params: FilterParams) {
  const q = searchParams(params);
  const r = await fetch(`${API_BASE}/api/bands?${q}`);
  if (!r.ok) throw new Error("Failed to fetch bands");
  return r.json() as Promise<{ rango: string; adjudicaciones: number; total_q: number }[]>;
}

export async function fetchTrend(params: FilterParams) {
  const q = searchParams(params);
  const r = await fetch(`${API_BASE}/api/trend?${q}`);
  if (!r.ok) throw new Error("Failed to fetch trend");
  return r.json() as Promise<{ mes: string; adjudicaciones: number; total_q: number }[]>;
}

export async function fetchTenders(params: FilterParams, limit = 100) {
  const q = searchParams(params) + (limit ? `&limit=${limit}` : "");
  const r = await fetch(`${API_BASE}/api/tenders?${q}`);
  if (!r.ok) throw new Error("Failed to fetch tenders");
  return r.json() as Promise<Record<string, unknown>[]>;
}

export async function fetchAwards(params: FilterParams, limit = 100) {
  const q = searchParams(params) + (limit ? `&limit=${limit}` : "");
  const r = await fetch(`${API_BASE}/api/awards?${q}`);
  if (!r.ok) throw new Error("Failed to fetch awards");
  return r.json() as Promise<Record<string, unknown>[]>;
}

export async function fetchDataReference() {
  try {
    const r = await fetch(`${API_BASE}/api/data-reference`);
    if (!r.ok) return {};
    return r.json() as Promise<{ last_downloaded?: string; package_date_range?: string }>;
  } catch {
    return {};
  }
}

export async function fetchSummaryByYear() {
  const r = await fetch(`${API_BASE}/api/summary-by-year`);
  if (!r.ok) throw new Error("Failed to fetch summary by year");
  return r.json() as Promise<
    { year: string; tenders_count: number; awards_count: number; total_amount: number }[]
  >;
}
