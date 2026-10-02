"use server";

import { redirect } from "next/navigation";
import { adminEnabled, passwordMatches, startAdminSession } from "@/lib/auth";

export async function signIn(formData: FormData): Promise<void> {
  if (!adminEnabled()) redirect("/admin/login?error=disabled");
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) redirect("/admin/login?error=wrong");
  await startAdminSession();
  redirect("/admin");
}
