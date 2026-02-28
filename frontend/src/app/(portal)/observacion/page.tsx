"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilterParams } from "@/hooks/use-filter-params";
import {
  fetchConcentration,
  fetchFilters,
  fetchSupplierDetail,
  fetchSupplierNames,
  fetchSuppliers,
  type FilterParams,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableCellTruncate,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { SearchInput, SortableHead, useTableSort } from "@/components/data-table-tools";

function buildParams(params: FilterParams, yearsFallback: string[]): FilterParams {
  const years = params.years?.length ? params.years : yearsFallback;
  return { ...params, years: years.length ? years : undefined };
}

export default function ObservacionPage() {
  const { params } = useFilterParams();
  const [filters, setFilters] = useState<{ years: string[] }>({ years: [] });
  const [suppliers, setSuppliers] = useState<
    { proveedor: string; adjudicaciones: number; total_q: number }[]
  >([]);
  const [concentration, setConcentration] = useState<{
    distinct_suppliers: number;
    top5_pct: number;
  } | null>(null);
  const [supplierNames, setSupplierNames] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [supplierDetail, setSupplierDetail] = useState<
    { nog: string; title: string; award_date: string | null; amount: number | null; currency: string | null }[]
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
      fetchSuppliers(effective).then(setSuppliers),
      fetchConcentration(effective).then(setConcentration),
      fetchSupplierNames(effective).then((names) => {
        setSupplierNames(names);
        if (names.length && !names.includes(selectedSupplier)) setSelectedSupplier(names[0]);
      }),
    ]).catch(() => setError("Error al cargar datos")).finally(() => setLoading(false));
  }, [params.years, params.from_month, params.to_month, filters.years]);

  useEffect(() => {
    if (!selectedSupplier) return;
    const effective = buildParams(params, filters.years);
    fetchSupplierDetail(selectedSupplier, { ...effective, years: effective.years ?? filters.years }).then(setSupplierDetail);
  }, [selectedSupplier, params.years, params.from_month, params.to_month, filters.years]);

  const [searchSuppliers, setSearchSuppliers] = useState("");
  const filteredSuppliers = useMemo(() => {
    const term = searchSuppliers.trim().toLowerCase();
    if (!term) return suppliers;
    return suppliers.filter((s) => s.proveedor.toLowerCase().includes(term));
  }, [suppliers, searchSuppliers]);
  const { sorted: sortedSuppliers, sortKey, sortDir, toggleSort } = useTableSort(
    filteredSuppliers,
    { initialSortKey: "total_q", initialSortDir: "desc" },
  );

  const totalAdjudicado = useMemo(
    () => suppliers.reduce((sum, s) => sum + s.total_q, 0),
    [suppliers],
  );

  return (
    <>
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-1">
        Observación ciudadana
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        ¿Quién recibe el dinero público? Concentración de adjudicaciones y detalle por proveedor.
      </p>

      {/* KPIs — first thing the user sees */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-md border border-border shadow-sm">
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total adjudicado</p>
            <p className="text-2xl font-bold tabular-nums">
              Q {totalAdjudicado.toLocaleString("es-GT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </Card>
        <Card className="rounded-md border border-border shadow-sm">
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Proveedores distintos</p>
            <p className="text-2xl font-bold tabular-nums">{concentration?.distinct_suppliers ?? "—"}</p>
          </div>
        </Card>
        <Card className="rounded-md border border-border shadow-sm">
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Top 5 concentran</p>
            <p className="text-2xl font-bold tabular-nums text-primary">
              {concentration != null ? `${concentration.top5_pct}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">del monto total</p>
          </div>
        </Card>
      </div>

      {/* Supplier detail — moved UP for visibility */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-1">
          Detalle por proveedor
        </h2>
        <p className="text-sm text-muted-foreground mb-3 max-w-2xl">
          Seleccione un proveedor para ver todas sus adjudicaciones en el período.
        </p>
        {supplierNames.length > 0 ? (
          <>
            <Select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="max-w-md mb-4 h-10 text-sm rounded-md border-border bg-background"
            >
              {supplierNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>

            {selectedSupplier && (
              <Card className="rounded-md border border-border shadow-sm overflow-hidden">
                <div className="bg-muted/40 px-4 py-2.5 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate" title={selectedSupplier}>
                    {selectedSupplier}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {supplierDetail.length} adjudicación{supplierDetail.length !== 1 ? "es" : ""} en el período
                    {supplierDetail.length > 0 && (
                      <> · Total: Q {supplierDetail.reduce((s, r) => s + (r.amount ?? 0), 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}</>
                    )}
                  </p>
                </div>
                <Table>
                  <colgroup>
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "42%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "26%" }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="font-medium text-foreground">NOG</TableHead>
                      <TableHead className="font-medium text-foreground">Título</TableHead>
                      <TableHead className="font-medium text-foreground">Fecha</TableHead>
                      <TableHead className="text-right font-medium text-foreground">Monto (Q)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierDetail.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground text-center py-8">
                          Sin adjudicaciones para este proveedor.
                        </TableCell>
                      </TableRow>
                    )}
                    {supplierDetail.map((row, i) => (
                      <TableRow key={row.nog + String(i)}>
                        <TableCell>{row.nog}</TableCell>
                        <TableCellTruncate title={row.title ?? undefined}>{row.title ?? "—"}</TableCellTruncate>
                        <TableCell>{row.award_date ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.amount != null ? `Q ${row.amount.toLocaleString("es-GT", { minimumFractionDigits: 2 })}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              NOG = número de proceso en Guatecompras.
            </p>
          </>
        ) : (
          !loading && <p className="text-sm text-muted-foreground">No hay proveedores en los datos.</p>
        )}
      </section>

      {/* Full supplier ranking */}
      <section>
        <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-1">
          Ranking de proveedores por monto
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Todos los proveedores adjudicados, ordenados por monto total.
        </p>
        <div className="mb-3">
          <SearchInput value={searchSuppliers} onChange={setSearchSuppliers} placeholder="Buscar proveedor…" className="max-w-xs" />
        </div>
        <Card className="rounded-md border border-border shadow-sm overflow-hidden">
          <Table>
            <colgroup>
              <col style={{ width: "50%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "28%" }} />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <SortableHead label="Proveedor" sortKey="proveedor" currentSortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("proveedor")} className="bg-muted/50 font-medium text-foreground" />
                <SortableHead label="Adjudicaciones" sortKey="adjudicaciones" currentSortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("adjudicaciones")} className="bg-muted/50 font-medium text-foreground" alignRight />
                <SortableHead label="Total (Q)" sortKey="total_q" currentSortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("total_q")} className="bg-muted/50 font-medium text-foreground" alignRight />
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
              {sortedSuppliers.slice(0, 50).map((row) => (
                <TableRow key={row.proveedor}>
                  <TableCellTruncate className="font-medium" title={row.proveedor}>{row.proveedor}</TableCellTruncate>
                  <TableCell className="text-right tabular-nums">{row.adjudicaciones}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    Q {row.total_q.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </>
  );
}
