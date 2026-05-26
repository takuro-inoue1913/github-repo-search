"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { NotFoundError } from "@/lib/errors";
import { ErrorState, Loading } from "@/ui/states";
import { useRepoDetail } from "./hooks/use-repo-detail";
import { RepoHeader } from "./components/repo-header";
import { RepoStats } from "./components/repo-stats";

type Props = { owner: string; name: string };

export function RepoDetailPage({ owner, name }: Props) {
  const query = useRepoDetail(owner, name);

  if (query.isError) {
    if (query.error instanceof NotFoundError) {
      notFound();
    }
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  }
  if (query.isPending) {
    return <Loading label="リポジトリ情報を取得中..." />;
  }

  const repo = query.data;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-900">
        ← 検索に戻る
      </Link>
      <RepoHeader repo={repo} />
      <RepoStats repo={repo} />
    </div>
  );
}
