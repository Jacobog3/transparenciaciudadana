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

function buildParams(params: FilterParams, yearsFallback: string[]): FilterParams {
  const years = params.years?.length ? params.years : yearsFallback;
  return { ...params, years: years.length ? years : undefined };
}

export default function DatosPage() {
  const { params } = useFilterParams();
  const [filters, setFilters] = useState<{ years: string[] }>({ years: [] });
  const [tenders, setTenders] = useState<Record<string, unknown>[]>([]);
  const [awards, setAwards] = useState<Record<string, unknown>[]>([]);
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

      <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
        Procesos
      </h2>
      <p className="text-muted-foreground text-sm mb-3">
        Listado de procesos (licitaciones) según el filtro seleccionado. Máximo 100 registros.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={searchTenders}
          onChange={setSearchTenders}
          placeholder="Buscar en procesos…"
        />
      </div>
      <Card className="rounded-md border border-border shadow-sm overflow-hidden mb-10">
        <div className="overflow-x-auto max-h-96">
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

      <h2 className="text-base font-semibold text-foreground border-l-4 border-primary pl-3 mb-3">
        Adjudicaciones
      </h2>
      <p className="text-muted-foreground text-sm mb-3">
        Listado de adjudicaciones según el filtro seleccionado. Máximo 100 registros.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          value={searchAwards}
          onChange={setSearchAwards}
          placeholder="Buscar en adjudicaciones…"
        />
      </div>
      <Card className="rounded-md border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-96">
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
