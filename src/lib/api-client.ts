import {
  NetworkError,
  NotFoundError,
  RateLimitError,
  UnknownApiError,
  ValidationError,
} from "@/lib/errors";
import type { Repository, SearchParams, SearchResult } from "@/types/repository";

/**
 * クライアント (ブラウザ) から /api/github/* を叩くための薄いクライアント。
 * Route Handler のエラー形式 ({ code, message, resetAt? }) を型付きエラーに変換する。
 */

type ApiErrorBody = { code: string; message: string; resetAt?: string };

async function call<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    throw new NetworkError("サーバーに接続できませんでした", { cause: e });
  }

  if (res.ok) return (await res.json()) as T;

  let body: ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    // ignore
  }
  const message = body?.message ?? `Request failed: ${res.status}`;

  switch (body?.code) {
    case "validation":
      throw new ValidationError(message);
    case "not_found":
      throw new NotFoundError(message);
    case "rate_limit":
      throw new RateLimitError(
        message,
        body?.resetAt ? new Date(body.resetAt) : new Date(),
      );
    default:
      throw new UnknownApiError(message, res.status);
  }
}

export function buildSearchQuery(params: SearchParams): string {
  const usp = new URLSearchParams();
  usp.set("q", params.q);
  if (params.language) usp.set("language", params.language);
  if (params.sort) usp.set("sort", params.sort);
  if (params.order) usp.set("order", params.order);
  usp.set("page", String(params.page));
  usp.set("perPage", String(params.perPage));
  return usp.toString();
}

export function fetchSearchRepositories(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<SearchResult> {
  return call<SearchResult>(`/api/github/search?${buildSearchQuery(params)}`, {
    signal,
  });
}

export function fetchRepository(
  owner: string,
  name: string,
  signal?: AbortSignal,
): Promise<Repository> {
  return call<Repository>(
    `/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    { signal },
  );
}
