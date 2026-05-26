"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRepository } from "@/lib/api-client";

export function repoDetailQueryKey(owner: string, name: string) {
  return ["repos", "detail", { owner, name }] as const;
}

export function useRepoDetail(owner: string, name: string) {
  return useQuery({
    queryKey: repoDetailQueryKey(owner, name),
    queryFn: ({ signal }) => fetchRepository(owner, name, signal),
    staleTime: 5 * 60_000,
  });
}
