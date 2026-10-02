/**
 * Deterministic synthetic data generator.
 *
 *   generateSeed({ projectCount: 240, now })  ->  same data every time for the same inputs
 *
 * Cohort dates are generated RELATIVE TO `now`, so the demo always has open, closed,
 * full and completed cohorts no matter when you deploy it.
 */
import { createHash } from "node:crypto";
import {
  FIRST_NAMES,
  INDUSTRIES,
  LAST_NAMES,
  MAX_UNIQUE_PROJECTS,
  ORGANIZATIONS,
  PROGRAMS,
  SCHOOLS,
  STATEMENTS,
  SUBJECTS_PER_INDUSTRY,
  VERBS,
} from "./seed-content";
import type {
  Application,
  ApplicationStatus,
  Cohort,
  Instructor,
  Organization,
  Project,
  Tag,
} from "./types";

export interface SeedData {
  industries: Tag[];
  skills: Tag[];
  organizations: Organization[];
  instructors: Instructor[];
  projects: Project[];
  cohorts: Cohort[];
  applications: Application[];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Small, fast, seedable PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): string {
  return isoDay(new Date(base.getTime() + days * 86_400_000));
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const COHORT_LENGTH_DAYS = 55; // 8 weeks, start to end inclusive of the last day

/**
 * Guaranteed demo scenario: the first project's first cohort is open, starts in a week (so it tops the
 * catalog) and has exactly ONE seat left plus several pending applicants. Accepting them all in the
 * admin shows the capacity rule: one is accepted, the rest become waitlist entries.
 */
export const DEMO_COHORT_ID = "coh-prj-1-1";
const DEMO_CAPACITY = 10;
const DEMO_PENDING = 4;

/** Deterministic UUID (v4 layout) so seeded ids fit a Postgres uuid column and never change between runs. */
function seededUuid(seed: number, namespace: string, n: number): string {
  const h = createHash("sha256").update(`${seed}:${namespace}:${n}`).digest("hex");
  const variant = ((Number.parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function generateSeed(opts: { projectCount: number; now: Date; seed?: number }): SeedData {
  const seedValue = opts.seed ?? 20261001;
  const rnd = mulberry32(seedValue);
  const int = (n: number) => Math.floor(rnd() * n);
  const pick = <T,>(arr: readonly T[]): T => arr[int(arr.length)];
  const today = startOfUtcDay(opts.now);

  const projectCount = Math.max(1, Math.min(opts.projectCount, MAX_UNIQUE_PROJECTS));

  const industries: Tag[] = INDUSTRIES.map((i) => ({ id: i.id, name: i.name, type: "industry" }));
  const skillMap = new Map<string, Tag>();
  for (const ind of INDUSTRIES) {
    for (const s of ind.skills) {
      const id = slugify(s);
      if (!skillMap.has(id)) skillMap.set(id, { id, name: s, type: "skill" });
    }
  }
  const organizations: Organization[] = ORGANIZATIONS.map((name) => ({ id: slugify(name), name }));

  const instructors: Instructor[] = [];
  const projects: Project[] = [];
  const cohorts: Cohort[] = [];
  const applications: Application[] = [];

  const combosPerIndustry = VERBS.length * SUBJECTS_PER_INDUSTRY; // 144, coprime with 5
  let appCounter = 0;

  const makeStudent = () => {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    appCounter += 1;
    return {
      name: `${first} ${last}`,
      email: `${first}.${last}.${appCounter}@example.edu`.toLowerCase(),
      school: pick(SCHOOLS),
      program: pick(PROGRAMS),
      graduationYear: 2026 + int(5),
    };
  };

  const addApplication = (cohortId: string, status: ApplicationStatus, submittedDaysAgo: number) => {
    applications.push({
      id: seededUuid(seedValue, "application", applications.length + 1),
      cohortId,
      student: makeStudent(),
      statement: pick(STATEMENTS),
      status,
      // always in the past: N days back from now, plus up to ~24h earlier
      submittedAt: new Date(opts.now.getTime() - submittedDaysAgo * 86_400_000 - int(86_000_000)).toISOString(),
    });
  };

  for (let i = 0; i < projectCount; i++) {
    const industry = INDUSTRIES[i % INDUSTRIES.length];
    const j = Math.floor(i / INDUSTRIES.length);
    // stride 5 is coprime with 144, so combos never repeat for j < 144
    const combo = (j * 5 + (i % INDUSTRIES.length) * 17) % combosPerIndustry;
    const verb = VERBS[combo % VERBS.length];
    const subject = industry.subjects[Math.floor(combo / VERBS.length)];
    const title = `${verb} ${subject}`;
    const verbLower = verb.toLowerCase();

    // Instructor: one per project, unique name via a coprime stride over first x last.
    const nameIdx = (i * 37) % (FIRST_NAMES.length * LAST_NAMES.length);
    const first = FIRST_NAMES[nameIdx % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(nameIdx / FIRST_NAMES.length)];
    const org = organizations[i % organizations.length];
    const role = industry.roles[int(industry.roles.length)];
    const instructor: Instructor = {
      id: `ins-${i + 1}`,
      slug: slugify(`${first} ${last}`),
      name: `${first} ${last}`,
      title: role,
      bio: `${first} is ${/^(ML|[AEIO])/.test(role) ? "an" : "a"} ${role} with ${6 + int(15)} years of experience in ${industry.name.toLowerCase()}. They mentor students through ${org.name} and enjoy turning real industry problems into approachable projects.`,
      organizationId: org.id,
    };
    instructors.push(instructor);

    // 3 to 5 skill tags from this industry.
    const shuffled = [...industry.skills];
    for (let k = shuffled.length - 1; k > 0; k--) {
      const r = int(k + 1);
      [shuffled[k], shuffled[r]] = [shuffled[r], shuffled[k]];
    }
    const skillIds = shuffled.slice(0, 3 + int(3)).map(slugify);
    const skillNames = skillIds.map((id) => skillMap.get(id)!.name);

    const project: Project = {
      id: `prj-${i + 1}`,
      slug: slugify(title),
      title,
      summary: `A hands-on 8-week project: ${verbLower} ${subject}, with weekly live Zoom workshops and feedback from an industry practitioner.`,
      description:
        `You will ${verbLower} ${subject} from first principles. The brief is realistic and deliberately open-ended: part of the work is deciding what to measure, what to ignore, and how to defend your choices.\n\n` +
        `Each week starts with a live Zoom workshop led by ${instructor.name}, followed by working sessions where you apply the ideas to your own deliverable. By week 8 you will have a finished piece you can show to employers and admissions committees.`,
      learningGoals: [
        `Apply ${skillNames[0]} to a realistic, open-ended brief`,
        `Structure and defend a recommendation using ${skillNames[1]}`,
        `Explain ${skillNames[2]} choices in plain language to a mixed audience`,
        "Give and respond to peer feedback in weekly live workshops",
        "Document your process so a reviewer could reproduce it",
      ],
      deliverable: pick(industry.deliverables),
      instructorId: instructor.id,
      organizationId: org.id,
      industryId: industry.id,
      skillTagIds: skillIds,
      status: "published",
    };
    projects.push(project);

    // Cohorts: one or two per project, dates relative to today.
    const cohortCount = rnd() < 0.35 ? 2 : 1;
    for (let c = 0; c < cohortCount; c++) {
      const bucket = rnd();
      let startOffset: number;
      let kind: "completed" | "running" | "open" | "full";
      if (bucket < 0.15) {
        startOffset = -(70 + int(60));
        kind = "completed";
      } else if (bucket < 0.28) {
        startOffset = -(5 + int(40));
        kind = "running";
      } else if (bucket < 0.88) {
        startOffset = 14 + int(70);
        kind = "open";
      } else {
        startOffset = 10 + int(20);
        kind = "full";
      }
      if (c === 1) startOffset += 84; // second run starts a cycle later
      if (c === 1 && (kind === "completed" || kind === "running")) kind = "open";

      const demoScenario = i === 0 && c === 0;
      if (demoScenario) {
        startOffset = 7;
        kind = "open";
      }
      const maxStudents = demoScenario ? DEMO_CAPACITY : 8 + int(8); // 8..15
      const cohort: Cohort = {
        id: `coh-${project.id}-${c + 1}`,
        projectId: project.id,
        startDate: addDays(today, startOffset),
        endDate: addDays(today, startOffset + COHORT_LENGTH_DAYS),
        applicationDeadline: addDays(today, startOffset - 7),
        minStudents: 5,
        maxStudents,
        zoomLink: `https://zoom.example.com/j/${100000000 + i * 10 + c}`,
      };
      cohorts.push(cohort);

      // Seed applications so admin views are never empty.
      if (demoScenario) {
        for (let k = 0; k < maxStudents - 1; k++) addApplication(cohort.id, "accepted", 6 + int(10));
        for (let k = 0; k < DEMO_PENDING; k++) addApplication(cohort.id, "submitted", int(3));
      } else if (kind === "completed" || kind === "running") {
        const enrolled = 5 + int(maxStudents - 4);
        for (let k = 0; k < enrolled; k++) addApplication(cohort.id, "enrolled", 40 + int(60));
        for (let k = 0; k < int(4); k++) addApplication(cohort.id, "rejected", 40 + int(60));
      } else if (kind === "full") {
        for (let k = 0; k < maxStudents; k++) addApplication(cohort.id, k % 2 ? "accepted" : "enrolled", 10 + int(20));
        for (let k = 0; k < 1 + int(3); k++) addApplication(cohort.id, "waitlisted", 5 + int(10));
      } else {
        const n = int(maxStudents + 4);
        let seats = 0;
        for (let k = 0; k < n; k++) {
          const r = rnd();
          let status: ApplicationStatus;
          if (r < 0.4) status = "submitted";
          else if (r < 0.65) status = "under_review";
          else if (r < 0.8 && seats < maxStudents - 1) {
            status = "accepted";
            seats += 1;
          } else if (r < 0.85) status = "waitlisted";
          else if (r < 0.95) status = "rejected";
          else status = "withdrawn";
          addApplication(cohort.id, status, int(25));
        }
      }
    }
  }

  return {
    industries,
    skills: [...skillMap.values()],
    organizations,
    instructors,
    projects,
    cohorts,
    applications,
  };
}
