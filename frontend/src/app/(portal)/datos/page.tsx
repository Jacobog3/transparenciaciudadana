"use client";

import { useEffect, useState } from "react";
import { useFilterParams } from "@/hooks/use-filter-params";
import { fetchAwards, fetchFilters, fetchTenders, type FilterParams } from "@/lib/api";
import { getAwardColumnLabel, getTenderColumnLabel } from "@/lib/column-labels";
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
import {
  SearchInput,
  SortableHead,
  useSearchFilter,
  useTableSort,
} from "@/components/data-table-tools";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function buildParams(params: FilterParams, yearsFallback: string[]): FilterParams {
  const years = params.years?.length ? params.years : yearsFallback;
  return { ...params, years: years.length ? years : undefined };
}

function asText(v: unknown): string {
  return v == null ? "—" : String(v);
}

export default function DatosPage() {
  const { params } = useFilterParams();
  const [filters, setFilters] = useState<{ years: string[] }>({ years: [] });
  const [tenders, setTenders] = useState<Record<string, unknown>[]>([]);
  const [awards, setAwards] = useState<Record<string, unknown>[]>([]);
  const [mobileSection, setMobileSection] = useState<"tenders" | "awards" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenderKeys = tenders.length > 0 ? Object.keys(tenders[0]) : [];
  const awardKeys = awards.length > 0 ? Object.keys(awards[0]) : [];

  const { filtered: filteredTenders, search: searchTenders, setSearch: setSearchTenders } = useSearchFilter(
    tenders,
    tenderKeys as (keyof Record<string, unknown>)[]
  );
  const { filtered: filteredAwards, search: searchAwards, setSearch: setSearchAwards } = useSearchFilter(
    awards,
    awardKeys as (keyof Record<string, unknown>)[]
  );

  const { sorted: sortedTenders, sortKey: sortKeyT, sortDir: sortDirT, toggleSort: toggleSortT } = useTableSort(
    filteredTenders,
    { initialSortKey: "date_published", initialSortDir: "desc" }
  );
  const { sorted: sortedAwards, sortKey: sortKeyA, sortDir: sortDirA, toggleSort: toggleSortA } = useTableSort(
    filteredAwards,
    { initialSortKey: "award_date", initialSortDir: "desc" }
  );

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
      fetchTenders(effective).then(setTenders),
      fetchAwards(effective).then(setAwards),
    ]).catch(() => setError("Error al cargar datos")).finally(() => setLoading(false));
  }, [params.years, params.from_month, params.to_month, filters.years]);

  return (
    <>
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      <div className="mb-5 space-y-3 md:hidden">
        <Collapsible
          open={mobileSection === "tenders"}
          onOpenChange={(open) => setMobileSection(open ? "tenders" : null)}
        >
          <Card className="rounded-md border border-border shadow-sm">
            <CollapsibleTrigger className="w-full px-4 py-3 text-left">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Procesos</p>
                <p className="text-xs text-muted-foreground">{sortedTenders.length} registros</p>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 border-t border-border p-4">
              <SearchInput
                value={searchTenders}
                onChange={setSearchTenders}
                placeholder="Buscar en procesos…"
              />
              <div className="space-y-3">
                {sortedTenders.length === 0 && !loading && (
                  <Card className="rounded-md border border-border shadow-sm">
                    <div className="p-4 text-sm text-muted-foreground">Sin procesos para el período seleccionado.</div>
                  </Card>
                )}
                {sortedTenders.slice(0, 30).map((row, i) => (
                  <Card key={i} className="rounded-md border border-border shadow-sm">
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-muted px-2 py-1 text-[11px] font-medium text-foreground">
                          NOG {asText(row.nog)}
                        </span>
                        <span className="max-w-[48%] truncate text-[11px] text-muted-foreground">
                          {asText(row.tender_status)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {asText(row.title)}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <p>Fecha: {asText(row.date_published)}</p>
                        <p className="truncate">Modalidad: {asText(row.procurement_method_details)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible
          open={mobileSection === "awards"}
          onOpenChange={(open) => setMobileSection(open ? "awards" : null)}
        >
          <Card className="rounded-md border border-border shadow-sm">
            <CollapsibleTrigger className="w-full px-4 py-3 text-left">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Adjudicaciones</p>
                <p className="text-xs text-muted-foreground">{sortedAwards.length} registros</p>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 border-t border-border p-4">
              <SearchInput
                value={searchAwards}
                onChange={setSearchAwards}
                placeholder="Buscar en adjudicaciones…"
              />
              <div className="space-y-3">
                {sortedAwards.length === 0 && !loading && (
                  <Card className="rounded-md border border-border shadow-sm">
                    <div className="p-4 text-sm text-muted-foreground">Sin adjudicaciones para el período seleccionado.</div>
                  </Card>
                )}
                {sortedAwards.slice(0, 30).map((row, i) => (
                  <Card key={i} className="rounded-md border border-border shadow-sm">
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-muted px-2 py-1 text-[11px] font-medium text-foreground">
                          NOG {asText(row.nog)}
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          Q {asText(row.amount)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {asText(row.title)}
                      </p>
                      <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                        <p className="truncate">Proveedor: {asText(row.supplier_name)}</p>
                        <p>Fecha: {asText(row.award_date)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      <h2 className="hidden md:block text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
        Procesos
      </h2>
      <p className="hidden md:block text-muted-foreground text-sm mb-3">
        Listado de procesos (licitaciones) según el filtro seleccionado. Máximo 100 registros.
      </p>
      <div className="mb-3 hidden md:flex flex-wrap items-center gap-2">
        <SearchInput
          value={searchTenders}
          onChange={setSearchTenders}
          placeholder="Buscar en procesos…"
        />
      </div>
      <Card className="hidden md:block rounded-md border border-border shadow-sm overflow-hidden mb-10">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                {tenderKeys.map((k) => (
                  <SortableHead
                    key={k}
                    label={getTenderColumnLabel(k)}
                    sortKey={k}
                    currentSortKey={sortKeyT}
                    sortDir={sortDirT}
                    onSort={() => toggleSortT(k)}
                    className="bg-muted/50 font-medium text-foreground whitespace-nowrap"
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTenders.slice(0, 100).map((row, i) => (
                <TableRow key={i}>
                  {tenderKeys.map((k) => {
                    const val = row[k] != null ? String(row[k]) : "—";
                    return (
                      <TableCellTruncate key={k} className="text-sm" title={val !== "—" ? val : undefined}>
                        {val}
                      </TableCellTruncate>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <h2 className="hidden md:block text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
        Adjudicaciones
      </h2>
      <p className="hidden md:block text-muted-foreground text-sm mb-3">
        Listado de adjudicaciones según el filtro seleccionado. Máximo 100 registros.
      </p>
      <div className="mb-3 hidden md:flex flex-wrap items-center gap-2">
        <SearchInput
          value={searchAwards}
          onChange={setSearchAwards}
          placeholder="Buscar en adjudicaciones…"
        />
      </div>
      <Card className="hidden md:block rounded-md border border-border shadow-sm overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                {awardKeys.map((k) => (
                  <SortableHead
                    key={k}
                    label={getAwardColumnLabel(k)}
                    sortKey={k}
                    currentSortKey={sortKeyA}
                    sortDir={sortDirA}
                    onSort={() => toggleSortA(k)}
                    className="bg-muted/50 font-medium text-foreground whitespace-nowrap"
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAwards.slice(0, 100).map((row, i) => (
                <TableRow key={i}>
                  {awardKeys.map((k) => {
                    const val = row[k] != null ? String(row[k]) : "—";
                    return (
                      <TableCellTruncate key={k} className="text-sm" title={val !== "—" ? val : undefined}>
                        {val}
                      </TableCellTruncate>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}
