"use client";

import { useEffect, useState } from "react";
import { useFilterParams } from "@/hooks/use-filter-params";
import {
  fetchFilters,
  fetchModalities,
  fetchTopSuppliersByModality,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SearchInput, SortableHead, useTableSort } from "@/components/data-table-tools";

function buildParams(params: FilterParams, yearsFallback: string[]): FilterParams {
  const years = params.years?.length ? params.years : yearsFallback;
  return { ...params, years: years.length ? years : undefined };
}

export default function ModalidadPage() {
  const { params } = useFilterParams();
  const [filters, setFilters] = useState<{ years: string[] }>({ years: [] });
  const [modalities, setModalities] = useState<
    { modalidad: string; procesos: number; total_q: number }[]
  >([]);
  const [topByModality, setTopByModality] = useState<
    { modalidad: string; proveedor: string; total_q: number; adjudicaciones: number; rn: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFilters().then((d) => setFilters(d));
  }, []);

  useEffect(() => {
    const yearsToUse = params.years?.length ? params.years : filters.years;
    if (!yearsToUse?.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const effective = buildParams(params, filters.years);
    const q = { ...effective, years: effective.years ?? filters.years };
    Promise.all([
      fetchModalities(q).then(setModalities),
      fetchTopSuppliersByModality(q).then(setTopByModality),
    ])
      .catch((err) => setError(err?.message || "Error al cargar datos."))
      .finally(() => setLoading(false));
  }, [params.years, params.from_month, params.to_month, filters.years]);

  const [searchMod, setSearchMod] = useState("");
  const filteredModalities = searchMod.trim()
    ? modalities.filter((m) => m.modalidad.toLowerCase().includes(searchMod.trim().toLowerCase()))
    : modalities;
  const { sorted: sortedModalities, sortKey, sortDir, toggleSort } = useTableSort(
    filteredModalities,
    { initialSortKey: "total_q", initialSortDir: "desc" },
  );

  return (
    <>
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-1">
        Por modalidad de contratación
      </h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
        Desglose por tipo de procedimiento (licitación, compra directa, etc.) y principales proveedores por modalidad.
      </p>

      <div className="mb-3">
        <SearchInput value={searchMod} onChange={setSearchMod} placeholder="Buscar modalidad…" className="max-w-xs" />
      </div>
      <Card className="rounded-md border border-border shadow-sm overflow-hidden mb-6">
        <Table>
          <colgroup>
            <col style={{ width: "50%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "28%" }} />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <SortableHead label="Modalidad" sortKey="modalidad" currentSortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("modalidad")} className="bg-muted/50 font-medium text-foreground" />
              <SortableHead label="Procesos" sortKey="procesos" currentSortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("procesos")} className="bg-muted/50 font-medium text-foreground" alignRight />
              <SortableHead label="Total (Q)" sortKey="total_q" currentSortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("total_q")} className="bg-muted/50 font-medium text-foreground" alignRight />
            </TableRow>
          </TableHeader>
          <TableBody>
            {modalities.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground text-center py-10">
                  Sin datos de modalidad para el período seleccionado.
                </TableCell>
              </TableRow>
            )}
            {sortedModalities.map((row) => (
              <TableRow key={row.modalidad}>
                <TableCellTruncate className="font-medium" title={row.modalidad}>{row.modalidad}</TableCellTruncate>
                <TableCell className="text-right tabular-nums">{row.procesos}</TableCell>
                <TableCell className="text-right tabular-nums">
                  Q {row.total_q.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {topByModality.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
            Principales proveedores por modalidad
          </h2>
          <div className="space-y-3">
            {Array.from(new Set(topByModality.map((x) => x.modalidad))).map((mod) => (
              <Collapsible key={mod} defaultOpen={false}>
                <Card className="rounded-md border border-border shadow-sm overflow-hidden">
                  <CollapsibleTrigger className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center gap-3 text-sm group">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground group-data-[state=open]:rotate-90 transition-transform"><path d="m9 18 6-6-6-6"/></svg>
                    <span className="font-medium text-foreground truncate">{mod}</span>
                    <span className="text-muted-foreground text-xs ml-auto shrink-0">Top 10</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border">
                      <Table>
                        <colgroup>
                          <col style={{ width: "50%" }} />
                          <col style={{ width: "22%" }} />
                          <col style={{ width: "28%" }} />
                        </colgroup>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b border-border">
                            <TableHead className="bg-muted/50 font-medium text-foreground">Proveedor</TableHead>
                            <TableHead className="text-right bg-muted/50 font-medium text-foreground">Adjudicaciones</TableHead>
                            <TableHead className="text-right bg-muted/50 font-medium text-foreground">Total (Q)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topByModality
                            .filter((x) => x.modalidad === mod)
                            .map((row) => (
                              <TableRow key={row.proveedor + row.modalidad}>
                                <TableCellTruncate title={row.proveedor}>{row.proveedor}</TableCellTruncate>
                                <TableCell className="text-right tabular-nums">{row.adjudicaciones}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  Q {row.total_q.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </>
      )}
    </>
  );
}
