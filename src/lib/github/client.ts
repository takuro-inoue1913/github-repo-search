import {
  NetworkError,
  NotFoundError,
  RateLimitError,
  UnknownApiError,
} from "@/lib/errors";

export type GithubFetchOptions = {
  signal?: AbortSignal;
  revalidate?: number;
  cache?: RequestCache;
};

const GITHUB_API_BASE = "https://api.github.com";

/**
 * GitHub API へのサーバー側 fetch。クライアントから直接呼ばず、Route Handler 経由で叩く前提。
 * - トークンは `GITHUB_TOKEN` (サーバー env) からのみ読む。NEXT_PUBLIC_ では絶対に持たない。
 * - レスポンスは型付きエラーに変換し、UI はその型で分岐する。
 */
export async function githubFetch(
  path: string,
  init: RequestInit = {},
  opts: GithubFetchOptions = {},
): Promise<unknown> {
  const url = path.startsWith("http") ? path : `${GITHUB_API_BASE}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      signal: opts.signal,
      cache: opts.cache,
      next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    throw new NetworkError("GitHub API への接続に失敗しました", { cause: e });
  }

  if (res.ok) return res.json();

  if (res.status === 404) {
    throw new NotFoundError("リソースが見つかりません");
  }

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if (remaining === "0") {
      const reset = Number(res.headers.get("x-ratelimit-reset") ?? "0");
      throw new RateLimitError(
        "GitHub API のレート制限に達しました",
        new Date(reset * 1000),
      );
    }
  }

  throw new UnknownApiError(
    `GitHub API がエラーを返しました (status=${res.status})`,
    res.status,
  );
}
