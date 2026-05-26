import type { RepositorySummary } from "@/types/repository";
import { RepoListItem } from "./repo-list-item";

type Props = { items: RepositorySummary[] };

export function RepoList({ items }: Props) {
  return (
    <ul className="flex flex-col gap-3" aria-label="検索結果">
      {items.map((repo) => (
        <RepoListItem key={repo.id} repo={repo} />
      ))}
    </ul>
  );
}
