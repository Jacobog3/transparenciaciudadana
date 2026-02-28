"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilterParams } from "@/hooks/use-filter-params";
import {
  fetchBands,
  fetchFilters,
  fetchLowCompetition,
  fetchTrend,
  type FilterParams,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableCellTruncate,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function buildParams(params: FilterParams, yearsFallback: string[]): FilterParams {
  const years = params.years?.length ? params.years : yearsFallback;
  return { ...params, years: years.length ? years : undefined };
}

function fmtQ(v: number) {
  if (v >= 1e6) return `Q${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `Q${(v / 1e3).toFixed(0)}K`;
  return `Q${v.toFixed(0)}`;
}

const BAR_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(221, 73%, 63%)",
  "hsl(221, 63%, 73%)",
  "hsl(221, 50%, 80%)",
];

export default function CompetenciaMontosPage() {
  const { params } = useFilterParams();
  const [filters, setFilters] = useState<{ years: string[] }>({ years: [] });
  const [lowComp, setLowComp] = useState<{
    count: number;
    tenders: { nog: string; title: string; procurement_method_details: string | null; number_of_tenderers: number | null; date_published: string | null; month: string | null }[];
  } | null>(null);
  const [bands, setBands] = useState<
    { rango: string; adjudicaciones: number; total_q: number }[]
  >([]);
  const [trend, setTrend] = useState<
    { mes: string; adjudicaciones: number; total_q: number }[]
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
      fetchLowCompetition(effective).then(setLowComp),
      fetchBands(effective).then(setBands),
      fetchTrend(effective).then(setTrend),
    ]).catch(() => setError("Error al cargar datos")).finally(() => setLoading(false));
  }, [params.years, params.from_month, params.to_month, filters.years]);

  const totalAdj = useMemo(() => trend.reduce((s, t) => s + t.total_q, 0), [trend]);
  const totalCount = useMemo(() => trend.reduce((s, t) => s + t.adjudicaciones, 0), [trend]);

  return (
    <>
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-1">
        Competencia y montos
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Evolución mensual del gasto, distribución por rangos legales y procesos con poca competencia.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-md border border-border shadow-sm">
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total adjudicado</p>
            <p className="text-2xl font-bold tabular-nums">
              Q {totalAdj.toLocaleString("es-GT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </Card>
        <Card className="rounded-md border border-border shadow-sm">
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Adjudicaciones</p>
            <p className="text-2xl font-bold tabular-nums">{totalCount.toLocaleString("es-GT")}</p>
          </div>
        </Card>
        <Card className="rounded-md border border-border shadow-sm">
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Poca competencia</p>
            <p className="text-2xl font-bold tabular-nums text-primary">{lowComp?.count ?? "—"}</p>
            <p className="text-xs text-muted-foreground">procesos con 0 o 1 oferente</p>
          </div>
        </Card>
      </div>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
          Evolución mensual
        </h2>
        {trend.length > 0 ? (
          <Card className="rounded-lg border border-border shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={trend} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(221, 83%, 53%)" />
                      <stop offset="100%" stopColor="hsl(221, 83%, 70%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtQ}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 13,
                      background: "hsl(var(--background))",
                      boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
                    }}
                    formatter={(value: number) => [`Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`, "Monto adjudicado"]}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="total_q" fill="url(#barGradient)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-lg border border-border shadow-sm">
            <CardContent className="py-10 text-center text-muted-foreground text-sm">Sin datos para el período.</CardContent>
          </Card>
        )}
      </section>

      {bands.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
            Adjudicaciones por rango de monto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-lg border border-border shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <ResponsiveContainer width="100%" height={bands.length * 56 + 24}>
                  <BarChart data={bands} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                    <XAxis type="number" tickFormatter={fmtQ} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="rango" width={140} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13, background: "hsl(var(--background))" }}
                      formatter={(value: number) => [`Q ${value.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`, "Total"]}
                    />
                    <Bar dataKey="total_q" radius={[0, 4, 4, 0]} maxBarSize={32}>
                      {bands.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="rounded-md border border-border shadow-sm overflow-hidden">
              <Table>
                <colgroup>
                  <col style={{ width: "44%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "34%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="bg-muted/60 font-semibold text-foreground">Rango</TableHead>
                    <TableHead className="text-right bg-muted/60 font-semibold text-foreground">Cantidad</TableHead>
                    <TableHead className="text-right bg-muted/60 font-semibold text-foreground">Total (Q)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bands.map((row) => (
                    <TableRow key={row.rango}>
                      <TableCell className="font-medium">{row.rango}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.adjudicaciones}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        Q {row.total_q.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Ref. legal: &lt; Q25,000 baja cuantía · Q25,000–Q90,000 compra directa · &gt; Q90,000 licitación
          </p>
        </section>
      )}

      {lowComp && lowComp.tenders.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
            Procesos con poca competencia
          </h2>
          <Collapsible defaultOpen={false}>
            <Card className="rounded-md border border-border shadow-sm overflow-hidden">
              <CollapsibleTrigger className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center gap-3 text-sm group">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground group-data-[state=open]:rotate-90 transition-transform"><path d="m9 18 6-6-6-6"/></svg>
                <span className="font-medium text-foreground">Ver {lowComp.count} procesos con 0 o 1 oferente</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border">
                  <Table>
                    <colgroup>
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "38%" }} />
                      <col style={{ width: "25%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "15%" }} />
                    </colgroup>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="bg-muted/60 font-semibold text-foreground">NOG</TableHead>
                        <TableHead className="bg-muted/60 font-semibold text-foreground">Título</TableHead>
                        <TableHead className="bg-muted/60 font-semibold text-foreground">Modalidad</TableHead>
                        <TableHead className="text-right bg-muted/60 font-semibold text-foreground">Oferentes</TableHead>
                        <TableHead className="bg-muted/60 font-semibold text-foreground">Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowComp.tenders.map((row) => (
                        <TableRow key={row.nog}>
                          <TableCell>{row.nog}</TableCell>
                          <TableCellTruncate title={row.title ?? undefined}>{row.title ?? "—"}</TableCellTruncate>
                          <TableCellTruncate title={row.procurement_method_details ?? undefined}>{row.procurement_method_details ?? "—"}</TableCellTruncate>
                          <TableCell className="text-right tabular-nums">{row.number_of_tenderers ?? "—"}</TableCell>
                          <TableCell>{row.date_published ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </section>
      )}
    </>
  );
}
