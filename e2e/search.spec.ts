import { expect, test, type Route } from "@playwright/test";

// E2E では GitHub API への実通信を避け、Route Handler 層 (/api/github/*) を Playwright で
// インターセプトする。レート制限と外部依存を排し、Happy Path の挙動を再現可能に検証する。

const searchPayload = {
  totalCount: 1,
  incompleteResults: false,
  items: [
    {
      id: 1,
      fullName: "facebook/react",
      name: "react",
      description: "A JavaScript library for building user interfaces.",
      language: "JavaScript",
      stargazersCount: 200_000,
      updatedAt: "2026-05-01T00:00:00Z",
      htmlUrl: "https://github.com/facebook/react",
      owner: {
        login: "facebook",
        avatarUrl: "https://avatars.githubusercontent.com/u/69631?v=4",
        htmlUrl: "https://github.com/facebook",
      },
    },
  ],
};

const detailPayload = {
  ...searchPayload.items[0],
  watchersCount: 6800,
  forksCount: 41000,
  openIssuesCount: 800,
  topics: ["javascript", "react", "ui"],
  defaultBranch: "main",
  license: "MIT",
};

const json = (data: unknown) => (route: Route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(data),
  });

test.describe("検索 → 詳細遷移 (Happy Path)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/github/search**", json(searchPayload));
    await page.route("**/api/github/repos/**", json(detailPayload));
  });

  test("初期表示では結果領域に何も描画されない (idle)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("searchbox", { name: "リポジトリを検索" })).toBeVisible();
    await expect(page.getByText("facebook/react")).toHaveCount(0);
  });

  test("キーワード検索 → 結果表示 → 詳細遷移 → Stats 表示", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("searchbox", { name: "リポジトリを検索" }).fill("react");
    await page.getByRole("button", { name: "検索" }).click();

    const result = page.getByText("facebook/react").first();
    await expect(result).toBeVisible();
    await expect(page).toHaveURL(/[?&]q=react/);

    await result.click();

    await expect(page).toHaveURL(/\/repositories\/facebook\/react/);
    await expect(page.getByRole("heading", { name: "react" })).toBeVisible();
    await expect(page.getByText("Stars")).toBeVisible();
    await expect(page.getByText("Watchers")).toBeVisible();
    await expect(page.getByText("Forks")).toBeVisible();
    await expect(page.getByText("Open Issues")).toBeVisible();
  });

  test("キーボードのみで検索 → 詳細遷移できる (a11y)", async ({ page }) => {
    await page.goto("/");

    const search = page.getByRole("searchbox", { name: "リポジトリを検索" });
    await search.focus();
    await search.fill("react");
    await page.keyboard.press("Enter");

    await expect(page.getByText("facebook/react").first()).toBeVisible();
    // 結果カード(リンク)にフォーカスして Enter で遷移
    await page
      .getByRole("link", { name: /facebook\/react/ })
      .first()
      .focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/repositories\/facebook\/react/);
  });
});
