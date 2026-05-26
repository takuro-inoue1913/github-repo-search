"use client";

import { useEffect, useState, type FormEvent } from "react";

type Props = {
  defaultValue: string;
  onSubmit: (q: string) => void;
};

export function SearchBar({ defaultValue, onSubmit }: Props) {
  const [value, setValue] = useState(defaultValue);

  // URL → 入力欄への片方向同期(他から URL が書き換えられた場合に追従)
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2" role="search">
      <label htmlFor="repo-search" className="sr-only">
        リポジトリを検索
      </label>
      <input
        id="repo-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="例: next.js, react state management"
        autoComplete="off"
        className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500"
      >
        検索
      </button>
    </form>
  );
}
