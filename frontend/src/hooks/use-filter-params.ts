"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { FilterParams } from "@/lib/api";

export function useFilterParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const params = useMemo<FilterParams>(() => {
    const p: FilterParams = {};
    const q = new URLSearchParams(queryString);
    const years = q.getAll("years");
    if (years.length) p.years = years;
    const from = q.get("from_month");
    if (from) p.from_month = from;
    const to = q.get("to_month");
    if (to) p.to_month = to;
    return p;
  }, [queryString]);

  const setParams = useCallback(
    (updates: Partial<FilterParams>) => {
      const next = new URLSearchParams(queryString);
      if (updates.years !== undefined) {
        next.delete("years");
        updates.years.forEach((y) => next.append("years", y));
      }
      if (updates.from_month !== undefined) {
        if (updates.from_month) next.set("from_month", updates.from_month);
        else next.delete("from_month");
      }
      if (updates.to_month !== undefined) {
        if (updates.to_month) next.set("to_month", updates.to_month);
        else next.delete("to_month");
      }
      const q = next.toString();
      router.push(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, queryString]
  );

  return { params, setParams, searchParams };
}
