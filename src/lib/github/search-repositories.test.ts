import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import { buildSearchPath } from "./search-repositories";

describe("buildSearchPath", () => {
  it("空クエリは ValidationError を投げる", () => {
    expect(() => buildSearchPath({ q: "  ", page: 1, perPage: 30 })).toThrow(
      ValidationError,
    );
  });

  it("language は q の qualifier として連結される", () => {
    const path = buildSearchPath({
      q: "react",
      language: "TypeScript",
      page: 1,
      perPage: 30,
    });
    expect(path).toContain("q=react+language%3ATypeScript");
  });

  it("sort=best-match は URL に含めない (GitHub のデフォルト挙動)", () => {
    const path = buildSearchPath({
      q: "react",
      sort: "best-match",
      page: 1,
      perPage: 30,
    });
    expect(path).not.toContain("sort=");
  });

  it("page/per_page をクエリに含める", () => {
    const path = buildSearchPath({ q: "react", page: 3, perPage: 50 });
    expect(path).toContain("page=3");
    expect(path).toContain("per_page=50");
  });
});
