import { describe, expect, it } from "vitest";
import { toRepository, toRepositorySummary, toSearchResult } from "./mappers";
import type { GhRepository, GhRepositorySummary, GhSearchResult } from "./schema";

const baseGhSummary: GhRepositorySummary = {
  id: 1,
  name: "react",
  full_name: "facebook/react",
  description: "ui lib",
  language: "JavaScript",
  stargazers_count: 100,
  updated_at: "2026-05-01T00:00:00Z",
  html_url: "https://github.com/facebook/react",
  owner: {
    login: "facebook",
    avatar_url: "https://example.com/a.png",
    html_url: "https://github.com/facebook",
  },
};

describe("toRepositorySummary", () => {
  it("snake_case を camelCase に変換しドメイン型を返す", () => {
    expect(toRepositorySummary(baseGhSummary)).toEqual({
      id: 1,
      name: "react",
      fullName: "facebook/react",
      description: "ui lib",
      language: "JavaScript",
      stargazersCount: 100,
      updatedAt: "2026-05-01T00:00:00Z",
      htmlUrl: "https://github.com/facebook/react",
      owner: {
        login: "facebook",
        avatarUrl: "https://example.com/a.png",
        htmlUrl: "https://github.com/facebook",
      },
    });
  });
});

describe("toRepository", () => {
  const baseGh: GhRepository = {
    ...baseGhSummary,
    watchers_count: 9999,
    subscribers_count: 42,
    forks_count: 10,
    open_issues_count: 3,
    topics: ["ui"],
    default_branch: "main",
    license: { spdx_id: "MIT", name: "MIT License" },
  };

  it("watchersCount は subscribers_count を優先する (GitHub watchers_count = stars の罠を回避)", () => {
    expect(toRepository(baseGh).watchersCount).toBe(42);
  });

  it("subscribers_count が無ければ watchers_count にフォールバックする", () => {
    const { subscribers_count, ...rest } = baseGh;
    void subscribers_count;
    expect(toRepository(rest).watchersCount).toBe(9999);
  });

  it("license は spdx_id を優先し、無ければ name にフォールバックする", () => {
    expect(toRepository(baseGh).license).toBe("MIT");
    expect(toRepository({ ...baseGh, license: null }).license).toBeNull();
  });
});

describe("toSearchResult", () => {
  it("items を ドメイン型の配列にマップする", () => {
    const gh: GhSearchResult = {
      total_count: 1,
      incomplete_results: false,
      items: [baseGhSummary],
    };
    const result = toSearchResult(gh);
    expect(result.totalCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.fullName).toBe("facebook/react");
  });
});
