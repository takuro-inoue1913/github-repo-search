import type { Metadata } from "next";
import { RepoDetailPage } from "@/features/repo-detail";

type RouteParams = { owner: string; name: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { owner, name } = await params;
  return {
    title: `${owner}/${name} - GitHub Repository Search`,
  };
}

export default async function Page({ params }: { params: Promise<RouteParams> }) {
  const { owner, name } = await params;
  return <RepoDetailPage owner={owner} name={name} />;
}
