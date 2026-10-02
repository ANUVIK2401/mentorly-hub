"use server";

import { redirect } from "next/navigation";
import { getRepo } from "@/data";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/data/types";
import { endAdminSession, requireAdmin } from "@/lib/auth";
import { hrefWith } from "@/lib/query";

const MAX_BULK = 200;
const NOTICE_KEYS = ["updated", "waitlisted", "notice"];

/** Only ever redirect back into the applications list. Strips old notice params. */
function safeReturnPath(raw: string): { path: string; params: URLSearchParams } {
  try {
    const u = new URL(raw, "http://local");
    if (u.pathname === "/admin/applications") {
      NOTICE_KEYS.forEach((k) => u.searchParams.delete(k));
      return { path: u.pathname, params: u.searchParams };
    }
  } catch {
    /* fall through */
  }
  return { path: "/admin/applications", params: new URLSearchParams() };
}

export async function updateStatuses(formData: FormData): Promise<void> {
  await requireAdmin();

  const { path, params } = safeReturnPath(String(formData.get("returnTo") ?? ""));
  const back = (extra: Record<string, string | number>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(extra)) merged.set(k, String(v));
    return hrefWith(path, Object.fromEntries(merged));
  };

  const status = String(formData.get("status") ?? "") as ApplicationStatus;
  if (!APPLICATION_STATUSES.includes(status)) redirect(back({ notice: "bad_status" }));

  const ids = [...new Set(formData.getAll("ids").map(String))].slice(0, MAX_BULK);
  if (ids.length === 0) redirect(back({ notice: "none_selected" }));

  const repo = getRepo();
  let updated = 0;
  let waitlisted = 0;
  for (const id of ids) {
    const result = await repo.updateApplicationStatus(id, status, "admin");
    if (result.ok) {
      updated += 1;
      if (result.waitlistedBecauseFull) waitlisted += 1;
    }
  }
  redirect(back({ updated, waitlisted }));
}

export async function signOut(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}
