import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminForm } from "../../admin-form";
import { saveInstructorAction } from "../../save-actions";
import { INSTRUCTOR_FIELDS, instructorDefaults } from "../instructor-fields";

export const metadata: Metadata = { title: "New instructor" };

export default async function NewInstructor() {
  await requireAdmin();
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link href="/admin/instructors" className="text-sm text-muted underline">
          All instructors
        </Link>
        <h1 className="text-3xl font-semibold">New instructor</h1>
      </div>
      <AdminForm
        action={saveInstructorAction}
        fields={INSTRUCTOR_FIELDS}
        defaults={instructorDefaults()}
        submitLabel="Create instructor"
      />
    </div>
  );
}
