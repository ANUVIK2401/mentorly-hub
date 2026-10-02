/**
 * Loads generateSeed() output into Postgres, in dependency order, in one transaction.
 * Used by `npm run db:seed` and by tests (against PGlite).
 */
import { randomUUID } from "node:crypto";
import type { SeedData } from "@/data/seed";
import type { Db } from "./client";
import {
  applications,
  cohorts,
  instructors,
  organizations,
  projects,
  projectTags,
  students,
  tags,
} from "./schema";

const BATCH = 500;

function* chunks<T>(rows: readonly T[]): Generator<T[]> {
  for (let i = 0; i < rows.length; i += BATCH) yield rows.slice(i, i + BATCH) as T[];
}

export async function loadSeed(db: Db, seed: SeedData): Promise<void> {
  await db.transaction(async (tx) => {
    for (const c of chunks(seed.organizations)) await tx.insert(organizations).values(c);

    const tagRows = [
      ...seed.industries.map((t, position) => ({ id: t.id, name: t.name, type: t.type, position })),
      ...seed.skills.map((t) => ({ id: t.id, name: t.name, type: t.type, position: 0 })),
    ];
    for (const c of chunks(tagRows)) await tx.insert(tags).values(c);

    for (const c of chunks(seed.instructors)) {
      await tx.insert(instructors).values(
        c.map((i) => ({
          id: i.id,
          slug: i.slug,
          name: i.name,
          title: i.title,
          bio: i.bio,
          linkedinUrl: i.linkedinUrl ?? null,
          organizationId: i.organizationId,
        })),
      );
    }

    for (const c of chunks(seed.projects)) {
      await tx.insert(projects).values(
        c.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          summary: p.summary,
          description: p.description,
          learningGoals: p.learningGoals,
          deliverable: p.deliverable,
          instructorId: p.instructorId,
          organizationId: p.organizationId,
          industryId: p.industryId,
          status: p.status,
        })),
      );
    }

    const links = seed.projects.flatMap((p) =>
      p.skillTagIds.map((tagId, position) => ({ projectId: p.id, tagId, position })),
    );
    for (const c of chunks(links)) await tx.insert(projectTags).values(c);

    for (const c of chunks(seed.cohorts)) {
      await tx.insert(cohorts).values(
        c.map((k) => ({
          id: k.id,
          projectId: k.projectId,
          startDate: k.startDate,
          endDate: k.endDate,
          applicationDeadline: k.applicationDeadline,
          minStudents: k.minStudents,
          maxStudents: k.maxStudents,
          zoomLink: k.zoomLink ?? null,
        })),
      );
    }

    const studentIds = new Map<string, string>();
    const studentRows = seed.applications.map((a) => {
      const id = randomUUID();
      studentIds.set(a.id, id);
      return { id, ...a.student, email: a.student.email.toLowerCase() };
    });
    for (const c of chunks(studentRows)) await tx.insert(students).values(c);

    for (const c of chunks(seed.applications)) {
      await tx.insert(applications).values(
        c.map((a) => ({
          id: a.id,
          cohortId: a.cohortId,
          studentId: studentIds.get(a.id)!,
          studentName: a.student.name,
          studentEmail: a.student.email.toLowerCase(),
          studentSchool: a.student.school,
          studentProgram: a.student.program,
          studentGraduationYear: a.student.graduationYear,
          statement: a.statement,
          status: a.status,
          submittedAt: new Date(a.submittedAt),
          reviewedBy: a.reviewedBy ?? null,
        })),
      );
    }
  });
}
