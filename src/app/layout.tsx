import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
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
        <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/85 backdrop-blur-md backdrop-saturate-150">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/projects" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-lg font-semibold sm:text-xl">
              <span aria-hidden className="relative inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent shadow-sm">
                <span className="h-2 w-2 rotate-45 bg-gold-bright" />
              </span>
              {SITE_NAME}
            </Link>
            <nav aria-label="Main" className="flex items-center gap-4 text-sm sm:gap-5">
              <Link href="/projects" className="font-medium text-ink transition-colors hover:text-accent">
                Projects
              </Link>
              <Link href="/instructors" className="font-medium text-ink transition-colors hover:text-accent">
                Instructors
              </Link>
              <Link href="/admin" className="text-muted transition-colors hover:text-accent">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-line bg-surface py-8 text-center text-xs text-muted">
          <span aria-hidden className="mx-auto mb-3 block h-1.5 w-1.5 rotate-45 bg-gold" />
          Mentorly Hub reference build. All projects, people and organizations shown are fictional.
        </footer>
      </body>
    </html>
  );
}
