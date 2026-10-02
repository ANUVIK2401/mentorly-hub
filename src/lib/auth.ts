/**
 * Minimal admin auth for the demo: one shared password (ADMIN_PASSWORD) and a signed,
 * httpOnly session cookie. This is deliberately simple. Replace it with real auth
 * (Supabase Auth, Auth.js, Clerk) before storing real student data. See docs/ROADMAP.md.
 *
 * RULES
 *  - Call `requireAdmin()` at the top of every admin page, server action and route handler.
 *    Do not rely on a layout or on proxy.ts: layouts do not re-run on every navigation and the
 *    proxy only does an optimistic cookie-presence check.
 *  - In production, admin is DISABLED unless ADMIN_PASSWORD is set. There is no default password.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE } from "./auth-constants";

const SESSION_SECONDS = 60 * 60 * 8;
const DEV_PASSWORD = "admin"; // only ever used when NODE_ENV !== "production"

function configuredPassword(): string | undefined {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === "production" ? undefined : DEV_PASSWORD;
}

export function adminEnabled(): boolean {
  return configuredPassword() !== undefined;
}

function signingKey(): string {
  return process.env.SESSION_SECRET || configuredPassword() || "";
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function passwordMatches(input: string): boolean {
  const expected = configuredPassword();
  return expected !== undefined && safeEqual(input, expected);
}

export async function startAdminSession(): Promise<void> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = String(expires);
  const store = await cookies();
  store.set(ADMIN_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  // Read cookies FIRST, unconditionally. Touching cookies() opts every admin route into dynamic
  // rendering. Without this, a build with no ADMIN_PASSWORD would prerender admin pages as a
  // static redirect and they would keep redirecting even after the variable is set at runtime.
  const store = await cookies();
  if (!adminEnabled()) return false;
  const raw = store.get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac || !safeEqual(mac, sign(payload))) return false;
  return Number(payload) > Math.floor(Date.now() / 1000);
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
