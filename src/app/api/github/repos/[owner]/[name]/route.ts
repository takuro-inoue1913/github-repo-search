import { NextResponse } from "next/server";
import {
  NotFoundError,
  RateLimitError,
  UnknownApiError,
  ValidationError,
} from "@/lib/errors";
import { getRepository } from "@/lib/github";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ owner: string; name: string }> },
) {
  const { owner, name } = await ctx.params;
  try {
    const repo = await getRepository(owner, name, { revalidate: 300 });
    return NextResponse.json(repo);
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
