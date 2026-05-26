"use client";

import { useRepoSearchQuery } from "./hooks/use-repo-search-query";
import { useRepoSearch } from "./hooks/use-repo-search";
import { SearchBar } from "./components/search-bar";
import { FilterPanel } from "./components/filter-panel";
import { RepoList } from "./components/repo-list";
import { Pagination } from "./components/pagination";
import { EmptyState, ErrorState, SkeletonList } from "@/ui/states";
import { formatNumber } from "@/lib/format";

export function RepoSearchPage() {
  const { params, update } = useRepoSearchQuery();
  const query = useRepoSearch(params);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <SearchBar
          defaultValue={params.q}
          onSubmit={(q) => update({ q }, { resetPage: true })}
        />
        <FilterPanel
          language={params.language}
          sort={params.sort}
          order={params.order}
          perPage={params.perPage}
          onChange={(next) => update(next, { resetPage: true })}
        />
      </section>

      <section aria-live="polite">{renderBody()}</section>
    </div>
  );

  function renderBody() {
    if (!params.q.trim()) {
      return (
        <EmptyState
          title="キーワードを入力してください"
          description="リポジトリ名・説明文・トピックを横断的に検索できます。"
        />
      );
    }
    if (query.isError) {
      return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
    }
    // 初回検索、もしくは検索条件 (q/language/sort/order/perPage) 変更で前データが
    // プレースホルダ扱いになっている間はスケルトンを出す。ページ送りでは前データを保持。
    if (query.isPending || query.isPlaceholderData) {
      return <SkeletonList count={Math.min(params.perPage, 6)} />;
    }
    const data = query.data;
    if (data.items.length === 0) {
      return (
        <EmptyState
          title={`「${params.q}」に一致するリポジトリはありません`}
          description="キーワードまたはフィルタを変更してください。"
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs text-neutral-500">
          {formatNumber(data.totalCount)} 件ヒット
          {query.isFetching && <span className="ml-2">更新中...</span>}
        </p>
        <RepoList items={data.items} />
        <Pagination
          page={params.page}
          perPage={params.perPage}
          totalCount={data.totalCount}
          onChange={(page) => update({ page })}
        />
      </div>
    );
  }
}
