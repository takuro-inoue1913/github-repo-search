export type Owner = {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
};

export type RepositorySummary = {
  id: number;
  owner: Owner;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  updatedAt: string;
  htmlUrl: string;
};

export type Repository = RepositorySummary & {
  watchersCount: number;
  forksCount: number;
  openIssuesCount: number;
  topics: string[];
  defaultBranch: string;
  license: string | null;
};

export type SearchSort = "stars" | "forks" | "updated" | "best-match";
export type SearchOrder = "asc" | "desc";

export type SearchParams = {
  q: string;
  language?: string;
  sort?: SearchSort;
  order?: SearchOrder;
  page: number;
  perPage: number;
};

export type SearchResult = {
  totalCount: number;
  incompleteResults: boolean;
  items: RepositorySummary[];
};
