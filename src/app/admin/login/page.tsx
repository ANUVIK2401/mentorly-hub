import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminEnabled, isAdmin } from "@/lib/auth";
import { first, type SearchParams } from "@/lib/query";
import { signIn } from "./actions";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  if (await isAdmin()) redirect("/admin");
  const error = first((await searchParams).error);
  const enabled = adminEnabled();

  return (
    <div className="mx-auto max-w-sm space-y-5 pt-8">
      <h1 className="text-3xl font-semibold">Admin sign in</h1>

      {!enabled ? (
        <div className="space-y-2 rounded-md border border-line bg-warn-soft p-4 text-sm text-warn">
          <p className="font-medium">Admin is disabled on this deployment.</p>
          <p>
            Set the <code>ADMIN_PASSWORD</code> environment variable (and redeploy) to enable it. There is intentionally no
            default password in production.
          </p>
        </div>
      ) : (
        <form action={signIn} className="space-y-4">
          {error === "wrong" ? (
            <p role="alert" className="rounded-md border border-bad bg-bad-soft p-3 text-sm text-bad">
              Incorrect password.
            </p>
          ) : null}
          {error === "rate" ? (
            <p role="alert" className="rounded-md border border-bad bg-bad-soft p-3 text-sm text-bad">
              Too many attempts. Wait a minute and try again.
            </p>
          ) : null}
          <label className="block space-y-1 text-sm font-medium">
            Password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="h-10 w-full rounded-md border border-line bg-paper px-3 text-sm"
            />
          </label>
          <button type="submit" className="h-10 w-full rounded-md bg-accent text-sm font-medium text-accent-ink hover:opacity-90">
            Sign in
          </button>
        </form>
      )}
    </div>
  );
}
