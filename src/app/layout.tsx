import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { NavLink } from "@/components/nav-link";
import { databaseUrl } from "@/db/url";
import "./globals.css";

const SITE_NAME = "Mentorly Hub";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME}: browse and apply to hands-on projects`, template: `%s | ${SITE_NAME}` },
  description:
    "A catalog of 8-week, instructor-led projects. Browse by industry and skill, see open cohorts, and apply.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every page per request so the CSP nonce set in proxy.ts can be applied to Next's scripts.
  await connection();
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-accent-ink"
        >
          Skip to main content
        </a>
        <div className="bg-accent-deep px-4 py-2 text-center text-xs text-white/85">
          Demo build with <strong className="font-semibold text-gold-bright">synthetic data</strong>.{" "}
          {databaseUrl() ? "" : "Applications are stored in memory and may reset. "}
          Please do not enter real personal information.
        </div>
        <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
          <div className="glass glass-header mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl py-2 pl-3 pr-2 sm:pl-4">
            <Link href="/projects" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap font-display text-lg font-semibold sm:text-xl">
              <span
                aria-hidden
                className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_4px_10px_-4px_rgb(28_58_138/0.6)]"
              >
                <span className="h-2.5 w-2.5 rotate-45 bg-gradient-to-br from-gold-bright to-gold" />
              </span>
              {SITE_NAME}
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1 text-sm">
              <NavLink href="/projects">Projects</NavLink>
              <NavLink href="/instructors">Instructors</NavLink>
              <NavLink href="/admin" quiet>
                Admin
              </NavLink>
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="mt-8 border-t border-line/70 py-10 text-center text-xs text-muted">
          <span aria-hidden className="mx-auto mb-3 block h-1.5 w-1.5 rotate-45 bg-gold" />
          Mentorly Hub reference build. All projects, people and organizations shown are fictional.
        </footer>
      </body>
    </html>
  );
}
