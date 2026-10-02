import type { InstructorOption, ProjectInput, Tag } from "@/data/types";
import { PROJECT_STATUSES } from "@/data/types";
import type { FieldSpec } from "@/lib/admin-form";

const STATUS_OPTIONS = PROJECT_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));

export function projectFields(instructors: InstructorOption[], industries: Tag[]): FieldSpec[] {
  return [
    { name: "title", label: "Title", kind: "text" },
    { name: "slug", label: "URL slug", kind: "text", half: true, hint: "Leave blank to generate from the title." },
    { name: "status", label: "Status", kind: "select", half: true, options: STATUS_OPTIONS, hint: "Only published projects are public." },
    { name: "summary", label: "Summary", kind: "textarea", rows: 2, hint: "Shown on the catalog card. 20 to 400 characters." },
    { name: "description", label: "Description", kind: "textarea", rows: 8 },
    { name: "learningGoals", label: "Learning goals", kind: "textarea", rows: 5, hint: "One per line." },
    { name: "deliverable", label: "Deliverable", kind: "text" },
    {
      name: "instructorId",
      label: "Instructor",
      kind: "select",
      half: true,
      options: instructors.map((i) => ({ value: i.id, label: `${i.name} (${i.organizationName})` })),
    },
    { name: "industryId", label: "Industry", kind: "select", half: true, options: industries.map((i) => ({ value: i.id, label: i.name })) },
    { name: "skillNames", label: "Skills", kind: "text", hint: "Comma separated, most relevant first. New names become new skill tags." },
  ];
}

export function projectDefaults(p?: ProjectInput): Record<string, string> {
  return {
    title: p?.title ?? "",
    slug: p?.slug ?? "",
    status: p?.status ?? "draft",
    summary: p?.summary ?? "",
    description: p?.description ?? "",
    learningGoals: p?.learningGoals.join("\n") ?? "",
    deliverable: p?.deliverable ?? "",
    instructorId: p?.instructorId ?? "",
    industryId: p?.industryId ?? "",
    skillNames: p?.skillNames.join(", ") ?? "",
  };
}
