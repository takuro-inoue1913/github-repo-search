import type { Repository } from "@/types/repository";
import { githubFetch } from "./client";
import { toRepository } from "./mappers";
import { repositorySchema } from "./schema";

export async function getRepository(
  owner: string,
  name: string,
  opts: { signal?: AbortSignal; revalidate?: number } = {},
): Promise<Repository> {
  const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const raw = await githubFetch(path, {}, opts);
  const parsed = repositorySchema.parse(raw);
  return toRepository(parsed);
}
