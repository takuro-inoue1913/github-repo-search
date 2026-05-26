"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchSearchRepositories } from "@/lib/api-client";
import type { SearchParams } from "@/types/repository";

export function repoSearchQueryKey(params: SearchParams) {
  return ["repos", "search", params] as const;
}

export function useRepoSearch(params: SearchParams) {
  const enabled = params.q.trim().length > 0;
  return useQuery({
    queryKey: repoSearchQueryKey(params),
    queryFn: ({ signal }) => fetchSearchRepositories(params, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}
