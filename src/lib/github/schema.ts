import { z } from "zod";

export const ownerSchema = z.object({
  login: z.string(),
  avatar_url: z.string().url(),
  html_url: z.string().url(),
});

export const repositorySummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  updated_at: z.string(),
  html_url: z.string().url(),
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
