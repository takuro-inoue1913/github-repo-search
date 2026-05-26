import { z } from "zod";

/**
 * GitHub REST API のレスポンスに対する zod スキーマ。
 * 本アプリで使うフィールドのみを抜粋している(完全網羅ではない)。
 *
 * 一次情報:
 * - REST API バージョン: 2022-11-28 (X-GitHub-Api-Version)
 * - Search repositories: https://docs.github.com/en/rest/search/search#search-repositories
 * - Get a repository:    https://docs.github.com/en/rest/repos/repos#get-a-repository
 * - 機械可読仕様 (OpenAPI): https://github.com/github/rest-api-description
 *
 * 互換性方針:
 * - `.strict()` は付けない。GitHub 側のフィールド追加で破綻させないため、未知フィールドは無視する。
 * - 既知フィールドの型変更は parse 時に例外となり、`lib/errors.ts` の境界で UI に到達させない。
 */

export const ownerSchema = z.object({
  login: z.string(),
  avatar_url: z.url(),
  html_url: z.url(),
});

export const repositorySummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  updated_at: z.string(),
  html_url: z.url(),
  owner: ownerSchema,
});

export const repositorySchema = repositorySummarySchema.extend({
  watchers_count: z.number(),
  subscribers_count: z.number().optional(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  topics: z.array(z.string()).default([]),
  default_branch: z.string(),
  license: z
    .object({ spdx_id: z.string().nullable(), name: z.string().nullable() })
    .nullable(),
});

export const searchResultSchema = z.object({
  total_count: z.number(),
  incomplete_results: z.boolean(),
  items: z.array(repositorySummarySchema),
});

export type GhRepositorySummary = z.infer<typeof repositorySummarySchema>;
export type GhRepository = z.infer<typeof repositorySchema>;
export type GhSearchResult = z.infer<typeof searchResultSchema>;
