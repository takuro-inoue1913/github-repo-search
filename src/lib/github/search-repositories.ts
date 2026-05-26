import { ValidationError } from "@/lib/errors";
import type { SearchParams, SearchResult } from "@/types/repository";
import { githubFetch } from "./client";
import { toSearchResult } from "./mappers";
import { searchResultSchema } from "./schema";

export function buildSearchPath(params: SearchParams): string {
  const q = params.q.trim();
  if (!q) throw new ValidationError("検索キーワードを入力してください");

  const qualifiers: string[] = [q];
  if (params.language) qualifiers.push(`language:${params.language}`);

  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", qualifiers.join(" "));
  if (params.sort && params.sort !== "best-match") {
    url.searchParams.set("sort", params.sort);
  }
  if (params.order) url.searchParams.set("order", params.order);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("per_page", String(params.perPage));
  return url.pathname + url.search;
}

export async function searchRepositories(
  params: SearchParams,
  opts: { signal?: AbortSignal; revalidate?: number } = {},
): Promise<SearchResult> {
  const path = buildSearchPath(params);
  const raw = await githubFetch(path, {}, opts);
  const parsed = searchResultSchema.parse(raw);
  return toSearchResult(parsed);
}
