import type { Repository } from "@/types/repository";
import { OwnerBadge } from "./owner-badge";

export function RepoHeader({ repo }: { repo: Repository }) {
  return (
    <header className="flex flex-col gap-3 border-b border-neutral-200 pb-4">
      <div className="flex items-center gap-3">
        <OwnerBadge owner={repo.owner} />
        <span className="text-neutral-300">/</span>
        <h1 className="text-xl font-semibold text-neutral-900">{repo.name}</h1>
        {repo.language && (
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
            {repo.language}
          </span>
        )}
      </div>
      {repo.description && (
        <p className="text-sm text-neutral-600">{repo.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        <a
          href={repo.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-100"
        >
          GitHub で開く
        </a>
        {repo.license && <span>License: {repo.license}</span>}
        {repo.topics.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label="トピック">
            {repo.topics.slice(0, 6).map((t) => (
              <li
                key={t}
                className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700"
              >
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}
