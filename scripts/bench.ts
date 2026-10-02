/**
 * npm run bench
 * Times the hot queries at the PRD's target scale (1,000 projects, ~11,800 applications) on both
 * repositories. The Postgres numbers are PGlite (in-process), so treat them as a floor for query
 * shape, not a prediction of network latency to a hosted database.
 */
import { createPostgresRepository } from "../src/data/postgres";
import { createMemoryRepository } from "../src/data/memory";
import { generateSeed } from "../src/data/seed";
import type { Repository } from "../src/data/repository";
import { createSeededTestDb } from "../tests/helpers/pglite";

const NOW = new Date("2026-10-01T12:00:00Z");

async function time(label: string, fn: () => Promise<unknown>, runs = 5): Promise<string> {
  await fn(); // warm up
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    await fn();
    samples.push(performance.now() - t);
  }
  samples.sort((a, b) => a - b);
  return `${label.padEnd(34)} median ${samples[Math.floor(runs / 2)].toFixed(1).padStart(7)} ms   worst ${samples[runs - 1].toFixed(1).padStart(7)} ms`;
}

async function bench(name: string, repo: Repository) {
  console.log(`\n${name}`);
  const lines = [
    await time("catalog page 1", () => repo.listProjects({ page: 1, pageSize: 12 })),
    await time("catalog industry+search+open", () => repo.listProjects({ industry: "finance", q: "credit", openOnly: true, page: 1, pageSize: 12 })),
    await time("project detail", () => repo.getProject("build-a-discounted-cash-flow-valuation-of-a-regional-retailer")),
    await time("admin applications page 1", () => repo.listApplications({ page: 1, pageSize: 25 })),
    await time("admin applications search", () => repo.listApplications({ q: "lakeview", page: 3, pageSize: 25 })),
    await time("admin cohort rows (all)", () => repo.listCohortRows()),
    await time("admin stats", () => repo.getAdminStats()),
    await time("export all applications", () => repo.exportApplications({}), 3),
  ];
  console.log(lines.join("\n"));
}

async function main() {
  const seed = generateSeed({ projectCount: 1000, now: NOW });
  console.log(`${seed.projects.length} projects, ${seed.cohorts.length} cohorts, ${seed.applications.length} applications`);
  await bench("memory", createMemoryRepository(seed, () => NOW));
  const { db } = await createSeededTestDb("bench", seed);
  await bench("postgres (PGlite)", createPostgresRepository(db, () => NOW));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
