"use client";

import { formatNumber } from "@/lib/format";

type Props = {
  page: number;
  perPage: number;
  totalCount: number;
  onChange: (page: number) => void;
};

// GitHub の search API は最大 1000 件まで
const GITHUB_SEARCH_MAX = 1000;

export function Pagination({ page, perPage, totalCount, onChange }: Props) {
  const effectiveTotal = Math.min(totalCount, GITHUB_SEARCH_MAX);
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / perPage));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const cappedNote =
    totalCount > GITHUB_SEARCH_MAX
      ? `(GitHub API の制約により最大 ${formatNumber(GITHUB_SEARCH_MAX)} 件まで表示)`
      : null;

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4"
      aria-label="ページネーション"
    >
      <p className="text-xs text-neutral-600">
        {formatNumber(totalCount)} 件中 {formatNumber((page - 1) * perPage + 1)} -
        {" "}
        {formatNumber(Math.min(page * perPage, effectiveTotal))} 件目
        {cappedNote && <span className="ml-2 text-neutral-400">{cappedNote}</span>}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={!hasPrev}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 hover:bg-neutral-100"
        >
          前へ
        </button>
        <span className="text-xs text-neutral-600">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={!hasNext}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 hover:bg-neutral-100"
        >
          次へ
        </button>
      </div>
    </nav>
  );
}
