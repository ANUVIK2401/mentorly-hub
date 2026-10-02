import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/data";
import { requireAdmin } from "@/lib/auth";
import { AdminForm } from "../../admin-form";
import { saveInstructorAction } from "../../save-actions";
import { INSTRUCTOR_FIELDS, instructorDefaults } from "../instructor-fields";

export const metadata: Metadata = { title: "Edit instructor" };

export default async function EditInstructor({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const instructor = await getRepo().getInstructorAdmin(id);
  if (!instructor) notFound();
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link href="/admin/instructors" className="text-sm text-muted underline">
          All instructors
        </Link>
        <h1 className="text-3xl font-semibold">{instructor.name}</h1>
      </div>
      <AdminForm
        action={saveInstructorAction}
        fields={INSTRUCTOR_FIELDS}
        defaults={instructorDefaults(instructor)}
        hidden={{ id }}
        submitLabel="Save changes"
      />
    </div>
  );
}
