/**
 * Single entry point for data access: `const repo = getRepo()`.
 *
 * To move to a real database, implement `Repository` (src/data/repository.ts) against
 * src/db/schema.ts and return it here when DATABASE_URL is set. See docs/ROADMAP.md.
 */
import { createMemoryRepository } from "./memory";
import type { Repository } from "./repository";
import { generateSeed } from "./seed";

const DEFAULT_PROJECTS = 240;

declare global {
  // Survives dev-server hot reloads so in-memory applications are not wiped on every edit.
  var __projectHubRepo: Repository | undefined;
}

function build(): Repository {
  const requested = Number.parseInt(process.env.SEED_COUNT ?? "", 10);
  const projectCount = Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_PROJECTS;
  const today = new Date();
  const seed = generateSeed({ projectCount, now: today });
  return createMemoryRepository(seed);
}

export function getRepo(): Repository {
  return (globalThis.__projectHubRepo ??= build());
}
