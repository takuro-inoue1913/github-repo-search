import type { Repository, RepositorySummary, SearchResult } from "@/types/repository";
import type { GhRepository, GhRepositorySummary, GhSearchResult } from "./schema";

export function toRepositorySummary(g: GhRepositorySummary): RepositorySummary {
  return {
    id: g.id,
    name: g.name,
    fullName: g.full_name,
    description: g.description,
    language: g.language,
    stargazersCount: g.stargazers_count,
    updatedAt: g.updated_at,
    htmlUrl: g.html_url,
    owner: {
      login: g.owner.login,
      avatarUrl: g.owner.avatar_url,
      htmlUrl: g.owner.html_url,
    },
  };
}

export function toRepository(g: GhRepository): Repository {
  return {
    ...toRepositorySummary(g),
    // GitHub の watchers_count は stargazers と同値。実態の watcher 数は subscribers_count。
    watchersCount: g.subscribers_count ?? g.watchers_count,
    forksCount: g.forks_count,
    openIssuesCount: g.open_issues_count,
    topics: g.topics,
    defaultBranch: g.default_branch,
    license: g.license?.spdx_id ?? g.license?.name ?? null,
  };
}

export function toSearchResult(g: GhSearchResult): SearchResult {
  return {
    totalCount: g.total_count,
    incompleteResults: g.incomplete_results,
    items: g.items.map(toRepositorySummary),
  };
}
