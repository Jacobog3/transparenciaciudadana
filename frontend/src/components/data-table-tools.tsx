"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export function useTableSort<T extends Record<string, unknown>>(
  data: T[],
  options?: { initialSortKey?: string | null; initialSortDir?: SortDirection }
) {
  const { initialSortKey = null, initialSortDir = "asc" } = options ?? {};
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>(initialSortDir);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const na = typeof va === "number" ? va : String(va ?? "");
      const nb = typeof vb === "number" ? vb : String(vb ?? "");
      const cmp = na < nb ? -1 : na > nb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  return { sorted, sortKey, sortDir, toggleSort };
}

export function useSearchFilter<T>(data: T[], searchKeys: (keyof T)[]) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((row) =>
      searchKeys.some((k) => {
        const v = row[k];
        return v != null && String(v).toLowerCase().includes(term);
      })
    );
  }, [data, search, searchKeys]);

  return { filtered, search, setSearch };
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
      aria-label={placeholder}
    />
  );
}

const SORT_ICON_SIZE = 16;

function SortIcon({ dir }: { dir: "asc" | "desc" }) {
  return (
    <span className="inline-flex items-center justify-center w-[var(--sort-icon-size)] shrink-0" aria-hidden>
      {dir === "asc" ? (
        <svg width={SORT_ICON_SIZE} height={SORT_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
      ) : (
        <svg width={SORT_ICON_SIZE} height={SORT_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      )}
    </span>
  );
}

export function SortableHead({
  label,
  sortKey,
  currentSortKey,
  sortDir,
  onSort,
  className,
  alignRight,
}: {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDir: SortDirection;
  onSort: () => void;
  className?: string;
  alignRight?: boolean;
}) {
  const isActive = currentSortKey === sortKey;
  return (
    <th
      role="columnheader"
      className={cn(
        "h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 cursor-pointer select-none hover:bg-muted/50 hover:text-foreground transition-colors",
        alignRight && "text-right",
        isActive && "text-foreground",
        className
      )}
      onClick={onSort}
      style={{ "--sort-icon-size": `${SORT_ICON_SIZE}px` } as React.CSSProperties}
    >
      <span className={cn("inline-flex items-center gap-1.5 min-w-0 w-full", alignRight && "justify-end")}>
        <span className={alignRight ? "truncate text-right" : "truncate"}>{label}</span>
        <span className="inline-flex items-center justify-center w-[var(--sort-icon-size)] shrink-0 text-muted-foreground">
          {isActive && sortDir ? <SortIcon dir={sortDir} /> : <span className="invisible" aria-hidden><SortIcon dir="asc" /></span>}
        </span>
      </span>
    </th>
  );
}
