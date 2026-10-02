"use server";

import { redirect } from "next/navigation";
import { LOGIN_RULE, limitByClient } from "@/lib/rate-limit";
import { adminEnabled, passwordMatches, startAdminSession } from "@/lib/auth";

export async function signIn(formData: FormData): Promise<void> {
  if (!adminEnabled()) redirect("/admin/login?error=disabled");
  if (!(await limitByClient(LOGIN_RULE)).allowed) redirect("/admin/login?error=rate");
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) redirect("/admin/login?error=wrong");
  await startAdminSession();
  redirect("/admin");
}
