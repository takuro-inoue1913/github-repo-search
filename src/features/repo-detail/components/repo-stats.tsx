import type { Repository } from "@/types/repository";
import { formatNumber } from "@/lib/format";

export function RepoStats({ repo }: { repo: Repository }) {
  const items: { label: string; value: number; hint?: string }[] = [
    { label: "Stars", value: repo.stargazersCount },
    {
      label: "Watchers",
      value: repo.watchersCount,
      hint: "GitHub の subscribers_count を使用",
    },
    { label: "Forks", value: repo.forksCount },
    { label: "Open Issues", value: repo.openIssuesCount },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-neutral-200 bg-white p-4"
          title={item.hint}
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {item.label}
          </dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
            {formatNumber(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
