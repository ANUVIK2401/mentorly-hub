import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { SeedData } from "@/data/seed";
import type { Db } from "@/db/client";
import { loadSeed } from "@/db/load-seed";
import * as schema from "@/db/schema";

export interface TestDb {
  db: Db;
  close: () => Promise<void>;
}

const wrap = (client: PGlite): TestDb => ({
  db: drizzle(client, { schema }) as unknown as Db,
  close: () => client.close(),
});

/** A fresh in-process Postgres with every real migration from /drizzle applied. */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  await migrate(drizzle(client, { schema }), { migrationsFolder: "./drizzle" });
  return wrap(client);
}

// Migrating and seeding costs seconds per database. Do it once per key, snapshot the data
// directory, and start every later test from the snapshot.
const snapshots = new Map<string, Promise<File | Blob>>();

/** A fresh database already holding `seed`. `key` must identify the seed (same key, same seed). */
export async function createSeededTestDb(key: string, seed: SeedData): Promise<TestDb> {
  let snapshot = snapshots.get(key);
  if (!snapshot) {
    snapshot = (async () => {
      const base = await createTestDb();
      await loadSeed(base.db, seed);
      const dump = await (base.db as unknown as { $client: PGlite }).$client.dumpDataDir("none");
      await base.close();
      return dump;
    })();
    snapshots.set(key, snapshot);
  }
  return wrap(new PGlite({ loadDataDir: await snapshot }));
}
