"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { SearchOrder, SearchParams, SearchSort } from "@/types/repository";

const SORTS = new Set<SearchSort>(["stars", "forks", "updated", "best-match"]);
const ORDERS = new Set<SearchOrder>(["asc", "desc"]);

export const PER_PAGE = 30;

/**
 * URL ↔ 検索状態の同期。URL を真実の源とする。
 * 値の更新は URL の置き換えとして行う(`router.replace`)。
 */
export function useRepoSearchQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const params = useMemo<SearchParams>(() => {
    const sortRaw = sp.get("sort");
    const orderRaw = sp.get("order");
    const page = Number(sp.get("page") ?? "1");
    return {
      q: sp.get("q") ?? "",
      language: sp.get("language") ?? undefined,
      sort: sortRaw && SORTS.has(sortRaw as SearchSort) ? (sortRaw as SearchSort) : undefined,
      order:
        orderRaw && ORDERS.has(orderRaw as SearchOrder)
          ? (orderRaw as SearchOrder)
          : undefined,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      perPage: PER_PAGE,
    };
  }, [sp]);

  const update = useCallback(
    (next: Partial<SearchParams>, opts: { resetPage?: boolean } = {}) => {
      const usp = new URLSearchParams(sp.toString());
      const merged: SearchParams = {
        ...params,
        ...next,
        page: opts.resetPage ? 1 : (next.page ?? params.page),
      };

      setOrDelete(usp, "q", merged.q);
      setOrDelete(usp, "language", merged.language);
      setOrDelete(usp, "sort", merged.sort);
      setOrDelete(usp, "order", merged.order);
      setOrDelete(usp, "page", merged.page > 1 ? String(merged.page) : "");

      const qs = usp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router, sp],
  );

  return { params, update };
}

function setOrDelete(usp: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null || value === "" || value === "best-match") {
    usp.delete(key);
  } else {
    usp.set(key, String(value));
  }
}
