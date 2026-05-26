import { http, HttpResponse } from "msw";
import type { Repository, SearchResult } from "@/types/repository";

export const sampleSummary = {
  id: 1,
  fullName: "facebook/react",
  name: "react",
  description: "A JavaScript library for building user interfaces.",
  language: "JavaScript",
  stargazersCount: 200_000,
  updatedAt: "2026-05-01T00:00:00Z",
  htmlUrl: "https://github.com/facebook/react",
  owner: {
    login: "facebook",
    avatarUrl: "https://avatars.githubusercontent.com/u/69631?v=4",
    htmlUrl: "https://github.com/facebook",
  },
} as const;

export const sampleSearch: SearchResult = {
  totalCount: 1,
  incompleteResults: false,
  items: [sampleSummary],
};

export const sampleRepository: Repository = {
  ...sampleSummary,
  watchersCount: 6800,
  forksCount: 41000,
  openIssuesCount: 800,
  topics: ["javascript", "react", "ui"],
  defaultBranch: "main",
  license: "MIT",
};

export const handlers = [
  http.get("/api/github/search", () => HttpResponse.json(sampleSearch)),
  http.get("/api/github/repos/:owner/:name", () =>
    HttpResponse.json(sampleRepository),
  ),
];
