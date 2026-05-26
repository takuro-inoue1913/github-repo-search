import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "../../../../test/utils";
import { SearchBar } from "./search-bar";

describe("SearchBar", () => {
  it("空文字では submit ボタンが無効", () => {
    const onSubmit = vi.fn();
    renderWithQuery(<SearchBar defaultValue="" onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "検索" })).toBeDisabled();
  });

  it("空白のみは submit されない", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithQuery(<SearchBar defaultValue="" onSubmit={onSubmit} />);
    await user.type(screen.getByRole("searchbox"), "   ");
    await user.click(screen.getByRole("button", { name: "検索" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("入力 → 検索ボタン押下で trim された値を submit する", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderWithQuery(<SearchBar defaultValue="" onSubmit={onSubmit} />);
    await user.type(screen.getByRole("searchbox"), "  next.js  ");
    await user.click(screen.getByRole("button", { name: "検索" }));
    expect(onSubmit).toHaveBeenCalledWith("next.js");
  });
});
