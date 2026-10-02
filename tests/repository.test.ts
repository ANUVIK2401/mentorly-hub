import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryRepository } from "@/data/memory";
import { MAX_UNIQUE_PROJECTS } from "@/data/seed-content";
import { isUuid } from "@/lib/uuid";
import { generateSeed } from "@/data/seed";
import { CONTRACT_NOW as NOW, runRepositoryContract } from "./contract/repository.contract";

function freshRepo(count = 120) {
  const seed = generateSeed({ projectCount: count, now: NOW });
  return { seed, repo: createMemoryRepository(seed, () => NOW) };
}

runRepositoryContract("memory", async (count = 120) => freshRepo(count));

describe("seed", () => {
  it("is deterministic", () => {
    const a = generateSeed({ projectCount: 50, now: NOW });
    const b = generateSeed({ projectCount: 50, now: NOW });
    assert.deepEqual(a, b);
  });

  it("produces unique slugs and instructor names at the maximum size", () => {
    const seed = generateSeed({ projectCount: MAX_UNIQUE_PROJECTS, now: NOW });
    assert.equal(seed.projects.length, MAX_UNIQUE_PROJECTS);
    assert.equal(new Set(seed.projects.map((p) => p.slug)).size, MAX_UNIQUE_PROJECTS);
    assert.equal(new Set(seed.instructors.map((i) => i.slug)).size, MAX_UNIQUE_PROJECTS);
  });

  it("clamps oversized requests instead of producing duplicates", () => {
    const seed = generateSeed({ projectCount: MAX_UNIQUE_PROJECTS + 500, now: NOW });
    assert.equal(seed.projects.length, MAX_UNIQUE_PROJECTS);
  });

  it("never seeds more seat-holders than a cohort's capacity", () => {
    const { seed } = freshRepo(200);
    const seats = new Map<string, number>();
    for (const a of seed.applications) {
      if (a.status === "accepted" || a.status === "enrolled") seats.set(a.cohortId, (seats.get(a.cohortId) ?? 0) + 1);
    }
    for (const c of seed.cohorts) assert.ok((seats.get(c.id) ?? 0) <= c.maxStudents, `cohort ${c.id} over capacity`);
  });

});

describe("seed realism", () => {
  it("never dates a seeded application in the future", () => {
    const seed = generateSeed({ projectCount: 300, now: NOW });
    const latest = Math.max(...seed.applications.map((a) => new Date(a.submittedAt).getTime()));
    assert.ok(latest <= NOW.getTime(), "an application is dated after 'now'");
  });
  it("gives every seeded application a unique, well-formed UUID (the Postgres column type)", () => {
    const seed = generateSeed({ projectCount: MAX_UNIQUE_PROJECTS, now: NOW });
    assert.ok(seed.applications.length > 10_000);
    assert.ok(seed.applications.every((a) => isUuid(a.id)));
    assert.equal(new Set(seed.applications.map((a) => a.id)).size, seed.applications.length);
  });
  it("uses the right article in instructor bios", () => {
    const seed = generateSeed({ projectCount: 300, now: NOW });
    for (const i of seed.instructors) {
      assert.ok(!/ is a (ML|[AEIO])/.test(i.bio), `bad article: ${i.bio.slice(0, 50)}`);
    }
  });
});
