import { NextResponse } from "next/server";
import {
  NotFoundError,
  RateLimitError,
  UnknownApiError,
  ValidationError,
} from "@/lib/errors";
import { searchRepositories } from "@/lib/github";
import type { SearchOrder, SearchParams, SearchSort } from "@/types/repository";

const ALLOWED_SORTS: SearchSort[] = ["stars", "forks", "updated", "best-match"];
const ALLOWED_ORDERS: SearchOrder[] = ["asc", "desc"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const language = url.searchParams.get("language") ?? undefined;
  const sortRaw = url.searchParams.get("sort");
  const orderRaw = url.searchParams.get("order");
  const page = Number(url.searchParams.get("page") ?? "1");
  const perPage = Math.min(Number(url.searchParams.get("perPage") ?? "30"), 100);

  const sort = ALLOWED_SORTS.includes(sortRaw as SearchSort)
    ? (sortRaw as SearchSort)
    : undefined;
  const order = ALLOWED_ORDERS.includes(orderRaw as SearchOrder)
    ? (orderRaw as SearchOrder)
    : undefined;

  const params: SearchParams = {
    q,
    language: language && language.length > 0 ? language : undefined,
    sort,
    order,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : 30,
  };

  try {
    const result = await searchRepositories(params, { revalidate: 60 });
    return NextResponse.json(result);
  } catch (e) {
    return errorToResponse(e);
  }
}

function errorToResponse(e: unknown): NextResponse {
  if (e instanceof ValidationError) {
    return NextResponse.json({ code: "validation", message: e.message }, { status: 400 });
  }
  if (e instanceof NotFoundError) {
    return NextResponse.json({ code: "not_found", message: e.message }, { status: 404 });
  }
  if (e instanceof RateLimitError) {
    return NextResponse.json(
      { code: "rate_limit", message: e.message, resetAt: e.resetAt.toISOString() },
      { status: 429 },
    );
  }
  if (e instanceof UnknownApiError) {
    return NextResponse.json({ code: "upstream", message: e.message }, { status: 502 });
  }
  return NextResponse.json(
    { code: "unknown", message: "Unexpected error" },
    { status: 500 },
  );
}
