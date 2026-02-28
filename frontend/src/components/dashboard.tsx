"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchBands,
  fetchConcentration,
  fetchDataReference,
  fetchFilters,
  fetchKpis,
  fetchLowCompetition,
  fetchModalities,
  fetchSupplierDetail,
  fetchSupplierNames,
  fetchSuppliers,
  fetchTopSuppliersByModality,
  fetchTrend,
  fetchAwards,
  fetchTenders,
  type FilterParams,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function Dashboard() {
  const [filters, setFilters] = useState<{ months: string[]; years: string[] }>({
    months: [],
    years: [],
  });
  const [params, setParams] = useState<FilterParams>({ years: [] });
  const [useRange, setUseRange] = useState(false);
  const [fromMonth, setFromMonth] = useState<string>("");
  const [toMonth, setToMonth] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [dataRef, setDataRef] = useState<{ last_downloaded?: string; package_date_range?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<{
    tenders_count: number;
    awards_count: number;
    total_amount: number;
  } | null>(null);
  const [suppliers, setSuppliers] = useState<
    { proveedor: string; adjudicaciones: number; total_q: number }[]
  >([]);
  const [concentration, setConcentration] = useState<{
    distinct_suppliers: number;
    top5_pct: number;
  } | null>(null);
  const [supplierNames, setSupplierNames] = useState<string[]>([]);
  const [supplierDetail, setSupplierDetail] = useState<
    { nog: string; title: string; award_date: string | null; amount: number | null; currency: string | null }[]
  >([]);
  const [modalities, setModalities] = useState<
    { modalidad: string; procesos: number; total_q: number }[]
  >([]);
  const [topByModality, setTopByModality] = useState<
    { modalidad: string; proveedor: string; total_q: number; adjudicaciones: number; rn: number }[]
  >([]);
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
  const [tenders, setTenders] = useState<Record<string, unknown>[]>([]);
  const [awards, setAwards] = useState<Record<string, unknown>[]>([]);

  const loadFilters = useCallback(async () => {
    try {
      const data = await fetchFilters();
      setFilters(data);
      if (data.years.length && !params.years?.length) {
        setParams((p) => ({ ...p, years: data.years }));
      }
      if (data.months.length && !fromMonth) {
        setFromMonth(data.months[0]);
        setToMonth(data.months[data.months.length - 1]);
      }
    } catch (e) {
      setError("No se pudo cargar la configuración. ¿Está corriendo la API?");
    }
  }, []);

  useEffect(() => {
    loadFilters();
    fetchDataReference().then(setDataRef);
  }, [loadFilters]);

  const effectiveParams = useCallback((): FilterParams => {
    const p: FilterParams = { years: params.years?.length ? params.years : filters.years };
    if (useRange && fromMonth) p.from_month = fromMonth;
    if (useRange && toMonth) p.to_month = toMonth;
    return p;
  }, [params.years, filters.years, useRange, fromMonth, toMonth]);

  useEffect(() => {
    const p = effectiveParams();
    if (!p.years?.length && !filters.years.length) return;
    setLoading(true);
    setError(null);
    const q = { ...p, years: p.years?.length ? p.years : filters.years };
    Promise.all([
      fetchKpis(q).then(setKpis),
      fetchSuppliers(q).then(setSuppliers),
      fetchConcentration(q).then(setConcentration),
      fetchSupplierNames(q).then((names) => {
        setSupplierNames(names);
        if (names.length && !names.includes(selectedSupplier)) setSelectedSupplier(names[0]);
      }),
      fetchModalities(q).then(setModalities),
      fetchTopSuppliersByModality(q).then(setTopByModality),
      fetchLowCompetition(q).then(setLowComp),
      fetchBands(q).then(setBands),
      fetchTrend(q).then(setTrend),
      fetchTenders(q).then(setTenders),
      fetchAwards(q).then(setAwards),
    ]).catch(() => setError("Error al cargar datos")).finally(() => setLoading(false));
  }, [effectiveParams, filters.years]);

  useEffect(() => {
    if (!selectedSupplier) return;
    fetchSupplierDetail(selectedSupplier, effectiveParams()).then(setSupplierDetail);
  }, [selectedSupplier, effectiveParams]);

  const filterCaption =
    params.years?.length || filters.years.length
      ? `Filtro: ${(params.years?.length ? params.years : filters.years).join(", ")}`
      : "Filtro: todos los años";
  const captionExtra =
    useRange && fromMonth && toMonth ? ` · ${fromMonth} a ${toMonth}` : "";
  const filterLabel = filterCaption + captionExtra;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header: stripe + title (Guatemala gov style) */}
      <header className="shrink-0">
        <div className="h-1.5 w-full bg-primary" />
        <div className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Transparencia
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Municipalidad de Antigua Guatemala · Contratación pública (Guatecompras OCDS)
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 space-y-4">
          <Card className="rounded-md border border-border shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium text-foreground">
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Año(s)</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {filters.years.map((y) => (
                  <label key={y} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.years?.includes(y) ?? false}
                      onChange={() => {
                        setParams((p) => ({
                          ...p,
                          years: p.years?.includes(y)
                            ? (p.years ?? []).filter((x) => x !== y)
                            : [...(p.years ?? []), y],
                        }));
                      }}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    {y}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer pt-1 border-t border-border">
                <input
                  type="checkbox"
                  checked={useRange}
                  onChange={(e) => setUseRange(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                Rango de meses
              </label>
              {useRange && filters.months.length > 0 && (
                <div className="space-y-2 pl-0">
                  <label className="text-xs text-muted-foreground">Desde</label>
                  <Select
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                    className="w-full h-9 text-sm"
                  >
                    {filters.months.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Select>
                  <label className="text-xs text-muted-foreground">Hasta</label>
                  <Select
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                    className="w-full h-9 text-sm"
                  >
                    {filters.months.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {(dataRef.last_downloaded || dataRef.package_date_range) && (
            <Collapsible defaultOpen={false}>
              <Card className="rounded-md border border-border shadow-sm">
                <CollapsibleTrigger className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors">
                  Referencia de los datos
                </CollapsibleTrigger>
                <CollapsibleContent className="text-xs text-muted-foreground space-y-1.5 px-4 pb-3">
                  <p><strong className="text-foreground">Fuente:</strong> Guatecompras OCDS (DGAE).</p>
                  {dataRef.last_downloaded && (
                    <p><strong className="text-foreground">Última descarga:</strong> {dataRef.last_downloaded}</p>
                  )}
                  {dataRef.package_date_range && (
                    <p><strong className="text-foreground">Publicación:</strong> {dataRef.package_date_range}</p>
                  )}
                  <p>Datos: Municipalidad de Antigua Guatemala (Sacatepéquez).</p>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 max-w-4xl space-y-10">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="muted" className="font-normal">
              {filterLabel}
            </Badge>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-md border border-border shadow-sm">
              <CardHeader className="pb-1 px-4 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Procesos publicados
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <span className="text-2xl font-semibold tabular-nums">
                  {loading ? "—" : kpis?.tenders_count ?? "—"}
                </span>
              </CardContent>
            </Card>
            <Card className="rounded-md border border-border shadow-sm">
              <CardHeader className="pb-1 px-4 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Adjudicaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <span className="text-2xl font-semibold tabular-nums">
                  {loading ? "—" : kpis?.awards_count ?? "—"}
                </span>
              </CardContent>
            </Card>
            <Card className="rounded-md border border-border shadow-sm">
              <CardHeader className="pb-1 px-4 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total adjudicado
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <span className="text-2xl font-semibold tabular-nums text-primary">
                  {loading ? "—" : kpis != null ? `Q ${kpis.total_amount.toLocaleString("es-GT", { maximumFractionDigits: 0 })}` : "—"}
                </span>
              </CardContent>
            </Card>
          </div>

          <section>
            <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
              Observación ciudadana
            </h2>
            <p className="text-muted-foreground text-sm mb-4 max-w-2xl">
              Revisión de <strong className="text-foreground">quién recibe las adjudicaciones</strong> y concentración en proveedores.
              Alta concentración puede merecer revisión o solicitud de información.
            </p>

            <h3 className="text-sm font-medium text-foreground mb-2">Quién se lleva las adjudicaciones (por monto)</h3>
            <Card className="rounded-md border border-border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="bg-muted/50 font-medium text-foreground">Proveedor</TableHead>
                    <TableHead className="text-right bg-muted/50 font-medium text-foreground">Adjudicaciones</TableHead>
                    <TableHead className="text-right bg-muted/50 font-medium text-foreground">Total (Q)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground text-center py-8">
                        No hay datos de adjudicaciones.
                      </TableCell>
                    </TableRow>
                  )}
                  {suppliers.slice(0, 20).map((row) => (
                    <TableRow key={row.proveedor}>
                      <TableCell className="font-medium">{row.proveedor}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.adjudicaciones}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        Q {row.total_q.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Card className="rounded-md border border-border shadow-sm">
                <CardHeader className="pb-1 px-4 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Proveedores distintos
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <span className="text-xl font-semibold tabular-nums">{concentration?.distinct_suppliers ?? "—"}</span>
                </CardContent>
              </Card>
              <Card className="rounded-md border border-border shadow-sm">
                <CardHeader className="pb-1 px-4 pt-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Top 5 concentran
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <span className="text-xl font-semibold tabular-nums text-primary">
                    {concentration != null ? `${concentration.top5_pct}%` : "—"}
                  </span>
                  <span className="text-muted-foreground text-sm ml-1">del total</span>
                </CardContent>
              </Card>
            </div>

            <h3 className="text-sm font-medium text-foreground mt-6 mb-2">Detalle por proveedor</h3>
            {supplierNames.length > 0 ? (
              <>
                <Select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="max-w-md mb-3 h-9 text-sm rounded-md border-border"
                >
                  {supplierNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </Select>
                <Card className="rounded-md border border-border shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border">
                        <TableHead className="bg-muted/50 font-medium text-foreground">NOG</TableHead>
                        <TableHead className="bg-muted/50 font-medium text-foreground">Título</TableHead>
                        <TableHead className="bg-muted/50 font-medium text-foreground">Fecha</TableHead>
                        <TableHead className="text-right bg-muted/50 font-medium text-foreground">Monto (Q)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierDetail.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-muted-foreground text-center">
                            Sin adjudicaciones para este proveedor.
                          </TableCell>
                        </TableRow>
                      )}
                      {supplierDetail.map((row, i) => (
                        <TableRow key={row.nog + String(i)}>
                          <TableCell>{row.nog}</TableCell>
                          <TableCell className="max-w-xs truncate">{row.title}</TableCell>
                          <TableCell>{row.award_date ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            {row.amount != null ? `Q ${row.amount.toLocaleString("es-GT", { minimumFractionDigits: 2 })}` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
                <p className="text-xs text-muted-foreground mt-1">
                  NOG = número de proceso en Guatecompras. Puede buscar el proceso en guatecompras.gt con ese número.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No hay proveedores en los datos.</p>
            )}
          </section>

          {/* Modalities */}
          <section>
            <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
              Por modalidad de contratación
            </h2>
            <Card className="rounded-md border border-border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="bg-muted/50 font-medium text-foreground">Modalidad</TableHead>
                    <TableHead className="text-right bg-muted/50 font-medium text-foreground">Procesos</TableHead>
                    <TableHead className="text-right bg-muted/50 font-medium text-foreground">Total (Q)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modalities.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground text-center">
                        Sin datos para el filtro seleccionado.
                      </TableCell>
                    </TableRow>
                  )}
                  {modalities.map((row) => (
                    <TableRow key={row.modalidad}>
                      <TableCell>{row.modalidad}</TableCell>
                      <TableCell className="text-right">{row.procesos}</TableCell>
                      <TableCell className="text-right">
                        Q {row.total_q.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <p className="text-xs text-muted-foreground mt-1">
              Compras directas y excepciones a licitación pueden merecer revisión según la ley.
            </p>

            <h3 className="text-sm font-medium text-foreground mt-4 mb-2">Principales proveedores por modalidad</h3>
            <div className="space-y-2">
              {Array.from(new Set(topByModality.map((x) => x.modalidad))).map((mod) => (
                <Collapsible key={mod} defaultOpen={false}>
                  <Card className="rounded-md border border-border shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <CollapsibleTrigger className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{mod}</span>
                        <span className="text-muted-foreground text-xs">Top 10 por monto</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Proveedor</TableHead>
                              <TableHead className="text-right">Adjudicaciones</TableHead>
                              <TableHead className="text-right">Total (Q)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {topByModality
                              .filter((x) => x.modalidad === mod)
                              .map((row) => (
                                <TableRow key={row.proveedor + row.modalidad}>
                                  <TableCell>{row.proveedor}</TableCell>
                                  <TableCell className="text-right">{row.adjudicaciones}</TableCell>
                                  <TableCell className="text-right">
                                    Q {row.total_q.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </section>

          {/* Low competition */}
          <section>
            <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
              Procesos con 0 o 1 oferente
            </h2>
            <Card className="rounded-md border border-border shadow-sm">
              <CardContent className="px-4 py-4">
                <p className="text-xl font-semibold tabular-nums">
                  {lowComp != null ? lowComp.count : "—"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    procesos con poca competencia
                  </span>
                </p>
              </CardContent>
            </Card>
            {lowComp && lowComp.tenders.length > 0 && (
              <Card className="rounded-md border border-border shadow-sm overflow-hidden mt-3">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="bg-muted/50 font-medium text-foreground">NOG</TableHead>
                      <TableHead className="bg-muted/50 font-medium text-foreground">Título</TableHead>
                      <TableHead className="bg-muted/50 font-medium text-foreground">Modalidad</TableHead>
                      <TableHead className="text-right bg-muted/50 font-medium text-foreground">Oferentes</TableHead>
                      <TableHead className="bg-muted/50 font-medium text-foreground">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowComp.tenders.map((row) => (
                      <TableRow key={row.nog}>
                        <TableCell>{row.nog}</TableCell>
                        <TableCell className="max-w-xs truncate">{row.title}</TableCell>
                        <TableCell>{row.procurement_method_details ?? "—"}</TableCell>
                        <TableCell className="text-right">{row.number_of_tenderers ?? "—"}</TableCell>
                        <TableCell>{row.date_published ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </section>

          {/* Bands */}
          <section>
            <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
              Adjudicaciones por rango de monto
            </h2>
            <p className="text-xs text-muted-foreground mb-3">
              &lt; Q25k baja cuantía · Q25k–Q90k compra directa · &gt; Q90k licitación
            </p>
            <Card className="rounded-md border border-border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="bg-muted/50 font-medium text-foreground">Rango</TableHead>
                    <TableHead className="text-right bg-muted/50 font-medium text-foreground">Adjudicaciones</TableHead>
                    <TableHead className="text-right bg-muted/50 font-medium text-foreground">Total (Q)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bands.map((row) => (
                    <TableRow key={row.rango}>
                      <TableCell>{row.rango}</TableCell>
                      <TableCell className="text-right">{row.adjudicaciones}</TableCell>
                      <TableCell className="text-right">
                        Q {row.total_q.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>

          {/* Trend */}
          <section>
            <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
              Adjudicaciones por mes
            </h2>
            {trend.length > 0 && (
              <Card className="rounded-md border border-border shadow-sm p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `Q ${(v / 1e6).toFixed(1)}M`} />
                    <Tooltip
                      formatter={(value: number) => [`Q ${value.toLocaleString("es-GT")}`, "Total (Q)"]}
                      labelFormatter={(label) => `Mes: ${label}`}
                    />
                    <Bar dataKey="total_q" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
            <Card className="rounded-md border border-border shadow-sm overflow-hidden mt-3">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="bg-muted/50 font-medium text-foreground">Mes</TableHead>
                    <TableHead className="text-right bg-muted/50 font-medium text-foreground">Adjudicaciones</TableHead>
                    <TableHead className="text-right bg-muted/50 font-medium text-foreground">Total (Q)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trend.map((row) => (
                    <TableRow key={row.mes}>
                      <TableCell>{row.mes}</TableCell>
                      <TableCell className="text-right">{row.adjudicaciones}</TableCell>
                      <TableCell className="text-right">
                        Q {row.total_q.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>

          {/* Raw tables */}
          <section>
            <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
              Procesos
            </h2>
            <Card className="rounded-md border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tenders.length > 0 &&
                        Object.keys(tenders[0]).map((k) => (
                          <TableHead key={k}>{k}</TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenders.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((v, j) => (
                          <TableCell key={j} className="max-w-[200px] truncate">
                            {v != null ? String(v) : "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
              Adjudicaciones
            </h2>
            <Card className="rounded-md border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {awards.length > 0 &&
                        Object.keys(awards[0]).map((k) => (
                          <TableHead key={k}>{k}</TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {awards.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((v, j) => (
                          <TableCell key={j} className="max-w-[200px] truncate">
                            {v != null ? String(v) : "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
