"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * 詳細ページから戻る導線。
 * - 履歴がある (= 検索結果一覧から遷移してきた) ときは `router.back()` で URL クエリを維持する
 * - 直リンクで開いた場合は履歴がないため `/` への通常リンクにフォールバックする
 *
 * `window` 参照は SSR 時に存在しないため `useSyncExternalStore` で読む
 * (`useEffect` + `setState` は react-hooks/set-state-in-effect で禁じられている)。
 */
export function BackToSearchButton({ onBack }: { onBack: () => void }) {
  const hasHistory = useSyncExternalStore(
    noopSubscribe,
    () => window.history.length > 1,
    () => false,
  );

  const className =
    "inline-flex w-fit items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400 rounded";

  if (hasHistory) {
    return (
      <button type="button" onClick={onBack} className={className}>
        ← 検索に戻る
      </button>
    );
  }
  return (
    <Link href="/" className={className}>
      ← 検索に戻る
    </Link>
  );
}
