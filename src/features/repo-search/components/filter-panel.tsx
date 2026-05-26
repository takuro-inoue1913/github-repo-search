"use client";

import type { SearchOrder, SearchSort } from "@/types/repository";
import { PER_PAGE_OPTIONS } from "../hooks/use-repo-search-query";

type Props = {
  language: string | undefined;
  sort: SearchSort | undefined;
  order: SearchOrder | undefined;
  perPage: number;
  onChange: (next: {
    language?: string | undefined;
    sort?: SearchSort | undefined;
    order?: SearchOrder | undefined;
    perPage?: number;
  }) => void;
};

const LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "Ruby",
  "Java",
  "C++",
];

export function FilterPanel({ language, sort, order, perPage, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-language" className="text-xs text-neutral-600">
          言語
        </label>
        <select
          id="filter-language"
          value={language ?? ""}
          onChange={(e) =>
            onChange({ language: e.target.value ? e.target.value : undefined })
          }
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900"
        >
          <option value="">すべて</option>
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-sort" className="text-xs text-neutral-600">
          並び順
        </label>
        <select
          id="filter-sort"
          value={sort ?? "best-match"}
          onChange={(e) => onChange({ sort: e.target.value as SearchSort })}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900"
        >
          <option value="best-match">関連度</option>
          <option value="stars">スター数</option>
          <option value="forks">フォーク数</option>
          <option value="updated">更新日</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-order" className="text-xs text-neutral-600">
          方向
        </label>
        <select
          id="filter-order"
          value={order ?? "desc"}
          onChange={(e) => onChange({ order: e.target.value as SearchOrder })}
          disabled={!sort || sort === "best-match"}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-400"
        >
          <option value="desc">降順</option>
          <option value="asc">昇順</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-per-page" className="text-xs text-neutral-600">
          表示件数
        </label>
        <select
          id="filter-per-page"
          value={perPage}
          onChange={(e) => onChange({ perPage: Number(e.target.value) })}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900"
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} 件 / ページ
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
