import Image from "next/image";
import Link from "next/link";
import type { RepositorySummary } from "@/types/repository";
import { formatCount, formatRelativeDate } from "@/lib/format";

type Props = { repo: RepositorySummary };

export function RepoListItem({ repo }: Props) {
  const [owner, name] = repo.fullName.split("/") as [string, string];
  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-neutral-400 hover:shadow-sm">
      <Link
        href={`/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`}
        className="block focus:outline-none focus:ring-2 focus:ring-neutral-400 rounded"
      >
        <div className="flex items-start gap-3">
          <Image
            src={repo.owner.avatarUrl}
            alt=""
            width={36}
            height={36}
            className="rounded-full"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3 className="truncate text-sm font-semibold text-neutral-900">
                {repo.fullName}
              </h3>
              {repo.language && (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700">
                  {repo.language}
                </span>
              )}
            </div>
            {repo.description && (
              <p className="mt-1 line-clamp-2 text-sm text-neutral-600">
                {repo.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
              <span aria-label="スター数">★ {formatCount(repo.stargazersCount)}</span>
              <span>更新: {formatRelativeDate(repo.updatedAt)}</span>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
