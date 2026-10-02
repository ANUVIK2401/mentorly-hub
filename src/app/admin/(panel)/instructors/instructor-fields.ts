import type { InstructorInput } from "@/data/types";
import type { FieldSpec } from "@/lib/admin-form";

export const INSTRUCTOR_FIELDS: FieldSpec[] = [
  { name: "name", label: "Full name", kind: "text", half: true },
  { name: "slug", label: "URL slug", kind: "text", half: true, hint: "Leave blank to generate from the name." },
  { name: "title", label: "Job title", kind: "text", half: true },
  { name: "organizationName", label: "Organization", kind: "text", half: true, hint: "An existing name is reused; a new one is created." },
  { name: "bio", label: "Bio", kind: "textarea", rows: 5 },
  { name: "linkedinUrl", label: "LinkedIn URL (optional)", kind: "url" },
];

export function instructorDefaults(i?: InstructorInput): Record<string, string> {
  return {
    name: i?.name ?? "",
    slug: i?.slug ?? "",
    title: i?.title ?? "",
    organizationName: i?.organizationName ?? "",
    bio: i?.bio ?? "",
    linkedinUrl: i?.linkedinUrl ?? "",
  };
}
