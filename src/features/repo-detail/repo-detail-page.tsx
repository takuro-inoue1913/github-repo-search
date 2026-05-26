"use client";

import { notFound, useRouter } from "next/navigation";
import { NotFoundError } from "@/lib/errors";
import { ErrorState, Loading } from "@/ui/states";
import { useRepoDetail } from "./hooks/use-repo-detail";
import { RepoHeader } from "./components/repo-header";
import { RepoStats } from "./components/repo-stats";
import { BackToSearchButton } from "./components/back-to-search-button";

type Props = { owner: string; name: string };

export function RepoDetailPage({ owner, name }: Props) {
  const query = useRepoDetail(owner, name);
  const router = useRouter();

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
      <BackToSearchButton onBack={() => router.back()} />
      <RepoHeader repo={repo} />
      <RepoStats repo={repo} />
    </div>
  );
}
