import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/msw/server";
import { fetchRepository, fetchSearchRepositories } from "./api-client";
import {
  NotFoundError,
  RateLimitError,
  UnknownApiError,
  ValidationError,
} from "./errors";

describe("api-client", () => {
  it("ok レスポンスをそのまま返す", async () => {
    const result = await fetchSearchRepositories({
      q: "react",
      page: 1,
      perPage: 30,
    });
    expect(result.items[0]?.fullName).toBe("facebook/react");
  });

  it("400 → ValidationError", async () => {
    server.use(
      http.get("/api/github/search", () =>
        HttpResponse.json({ code: "validation", message: "bad" }, { status: 400 }),
      ),
    );
    await expect(
      fetchSearchRepositories({ q: "", page: 1, perPage: 30 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("404 → NotFoundError", async () => {
    server.use(
      http.get("/api/github/repos/:o/:n", () =>
        HttpResponse.json({ code: "not_found", message: "no" }, { status: 404 }),
      ),
    );
    await expect(fetchRepository("x", "y")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("429 → RateLimitError (resetAt 復元)", async () => {
    const resetAt = new Date("2026-06-01T12:00:00Z").toISOString();
    server.use(
      http.get("/api/github/search", () =>
        HttpResponse.json(
          { code: "rate_limit", message: "rl", resetAt },
          { status: 429 },
        ),
      ),
    );
    await expect(
      fetchSearchRepositories({ q: "x", page: 1, perPage: 30 }),
    ).rejects.toMatchObject({
      constructor: RateLimitError,
      resetAt: new Date(resetAt),
    });
  });

  it("502 → UnknownApiError", async () => {
    server.use(
      http.get("/api/github/search", () =>
        HttpResponse.json({ code: "upstream", message: "upstream" }, { status: 502 }),
      ),
    );
    await expect(
      fetchSearchRepositories({ q: "x", page: 1, perPage: 30 }),
    ).rejects.toBeInstanceOf(UnknownApiError);
  });
});
