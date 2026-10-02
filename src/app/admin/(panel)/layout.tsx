import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "./actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Convenience only. Every admin page and action also calls requireAdmin() itself.
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <nav aria-label="Admin" className="flex flex-wrap gap-5 text-sm font-medium">
          <Link href="/admin" className="hover:underline">
            Overview
          </Link>
          <Link href="/admin/applications" className="hover:underline">
            Applications
          </Link>
          <Link href="/admin/cohorts" className="hover:underline">
            Cohorts
          </Link>
          <Link href="/admin/projects" className="hover:underline">
            Projects
          </Link>
          <Link href="/admin/instructors" className="hover:underline">
            Instructors
          </Link>
          <a href="/admin/export" className="hover:underline">
            Export to Excel
          </a>
        </nav>
        <form action={signOut}>
          <button type="submit" className="text-sm text-muted underline">
            Sign out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
