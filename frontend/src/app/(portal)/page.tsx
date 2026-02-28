"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFilterParams } from "@/hooks/use-filter-params";
import { fetchKpis, fetchSummaryByYear, fetchFilters, type FilterParams } from "@/lib/api";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function buildParams(params: FilterParams, yearsFallback: string[]): FilterParams {
  const years = params.years?.length ? params.years : yearsFallback;
  return { ...params, years: years.length ? years : undefined };
}

const SECTIONS = [
  {
    href: "/observacion",
    title: "Observación ciudadana",
    desc: "¿Quién recibe el dinero público? Concentración y detalle por proveedor.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
    ),
  },
  {
    href: "/modalidad",
    title: "Por modalidad",
    desc: "Licitación, compra directa y proveedores por tipo de procedimiento.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    ),
  },
  {
    href: "/competencia-montos",
    title: "Competencia y montos",
    desc: "Evolución del gasto, rangos legales y procesos con poca competencia.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    ),
  },
  {
    href: "/datos",
    title: "Datos",
    desc: "Tablas completas de procesos y adjudicaciones.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
    ),
  },
] as const;

export default function GeneralPage() {
  const { params, searchParams } = useFilterParams();
  const [filters, setFilters] = useState<{ years: string[] }>({ years: [] });
  const [kpis, setKpis] = useState<{
    tenders_count: number;
    awards_count: number;
    total_amount: number;
  } | null>(null);
  const [summaryByYear, setSummaryByYear] = useState<
    { year: string; tenders_count: number; awards_count: number; total_amount: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFilters().then((d) => setFilters(d));
  }, []);

  useEffect(() => {
    const q = buildParams(params, filters.years);
    if (!q.years?.length && !filters.years.length) return;
    setLoading(true);
    setError(null);
    const effective = { ...q, years: q.years ?? filters.years };
    Promise.all([
      fetchKpis(effective).then(setKpis),
      fetchSummaryByYear().then(setSummaryByYear),
    ]).catch(() => setError("Error al cargar datos")).finally(() => setLoading(false));
  }, [params.years, params.from_month, params.to_month, filters.years]);

  const qs = searchParams.toString();

  return (
    <>
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-md border border-border shadow-sm">
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Procesos publicados</p>
            <p className="text-2xl font-bold tabular-nums">
              {loading ? "—" : kpis?.tenders_count?.toLocaleString("es-GT") ?? "—"}
            </p>
          </div>
        </Card>
        <Card className="rounded-md border border-border shadow-sm">
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Adjudicaciones</p>
            <p className="text-2xl font-bold tabular-nums">
              {loading ? "—" : kpis?.awards_count?.toLocaleString("es-GT") ?? "—"}
            </p>
          </div>
        </Card>
        <Card className="rounded-md border border-border shadow-sm">
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total adjudicado</p>
            <p className="text-2xl font-bold tabular-nums text-primary">
              {loading ? "—" : kpis != null ? `Q ${kpis.total_amount.toLocaleString("es-GT", { maximumFractionDigits: 0 })}` : "—"}
            </p>
          </div>
        </Card>
      </div>

      {/* Summary by year */}
      {summaryByYear.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
            Resumen por año
          </h2>
          <Card className="rounded-md border border-border shadow-sm overflow-hidden">
            <Table>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "36%" }} />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="bg-muted/50 font-medium text-foreground">Año</TableHead>
                  <TableHead className="text-right bg-muted/50 font-medium text-foreground">Procesos</TableHead>
                  <TableHead className="text-right bg-muted/50 font-medium text-foreground">Adjudicaciones</TableHead>
                  <TableHead className="text-right bg-muted/50 font-medium text-foreground">Total (Q)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryByYear.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell className="font-medium">{row.year}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.tenders_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.awards_count}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      Q {row.total_amount.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {/* Section navigation cards */}
      <section>
        <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
          Explorar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map(({ href, title, desc, icon }) => (
            <Link
              key={href}
              href={qs ? `${href}?${qs}` : href}
              className="group"
            >
              <Card className="rounded-md border border-border shadow-sm hover:border-primary/40 hover:shadow-md transition-all h-full">
                <div className="flex items-start gap-3 px-4 py-4">
                  <span className="shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                    {icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
