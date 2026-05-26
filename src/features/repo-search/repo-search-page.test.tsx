import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/msw/server";
import { renderWithQuery } from "../../../test/utils";

const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => searchParams,
}));

import { RepoSearchPage } from "./repo-search-page";

describe("RepoSearchPage", () => {
  it("クエリ未入力では初期状態の空状態を表示する (idle)", () => {
    searchParams.delete("q");
    renderWithQuery(<RepoSearchPage />);
    expect(
      screen.getByText("キーワードを入力してください"),
    ).toBeInTheDocument();
  });

  it("ヒット 0 件で empty を表示する", async () => {
    searchParams.set("q", "react");
    server.use(
      http.get("/api/github/search", () =>
        HttpResponse.json({ totalCount: 0, incompleteResults: false, items: [] }),
      ),
    );
    renderWithQuery(<RepoSearchPage />);
    expect(
      await screen.findByText(/「react」に一致するリポジトリはありません/),
    ).toBeInTheDocument();
  });

  it("成功時は結果一覧を表示する", async () => {
    searchParams.set("q", "react");
    renderWithQuery(<RepoSearchPage />);
    expect(await screen.findByText("facebook/react")).toBeInTheDocument();
  });

  it("エラー時はリトライ可能な ErrorState を表示する", async () => {
    searchParams.set("q", "react");
    server.use(
      http.get("/api/github/search", () =>
        HttpResponse.json(
          { code: "upstream", message: "upstream" },
          { status: 502 },
        ),
      ),
    );
    renderWithQuery(<RepoSearchPage />);
    expect(await screen.findByText("サーバーエラー")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
  });
});
