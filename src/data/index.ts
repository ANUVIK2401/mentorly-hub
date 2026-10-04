/**
 * Single entry point for data access: `const repo = getRepo()`.
 *
 * Database URL set (DATABASE_URL or POSTGRES_URL, see src/db/url.ts) -> PostgresRepository, data persists.
 * Neither set -> in-memory repository over the synthetic seed (zero-setup demo, tests).
 */
import { createMemoryRepository } from "./memory";
import { createPostgresRepository } from "./postgres";
import { getDb } from "@/db/client";
import { databaseUrl } from "@/db/url";
import type { Repository } from "./repository";
import { generateSeed } from "./seed";

const DEFAULT_PROJECTS = 240;

declare global {
  // Survives dev-server hot reloads so in-memory applications are not wiped on every edit.
  var __projectHubRepo: Repository | undefined;
}

function build(): Repository {
  // A configured database wins. Without one the app runs on the in-memory demo repository.
  if (databaseUrl()) return createPostgresRepository(getDb());
  const requested = Number.parseInt(process.env.SEED_COUNT ?? "", 10);
  const projectCount = Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_PROJECTS;
  const today = new Date();
  const seed = generateSeed({ projectCount, now: today });
  return createMemoryRepository(seed);
}

export function getRepo(): Repository {
  return (globalThis.__projectHubRepo ??= build());
}
