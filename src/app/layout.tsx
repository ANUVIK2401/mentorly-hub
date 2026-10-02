import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const SITE_NAME = "Project Hub";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME}: browse and apply to hands-on projects`, template: `%s | ${SITE_NAME}` },
  description:
    "A catalog of 8-week, instructor-led projects. Browse by industry and skill, see open cohorts, and apply.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <div className="border-b border-line bg-accent-soft px-4 py-1.5 text-center text-xs text-ink">
          Demo build with <strong>synthetic data</strong>. Applications are stored in memory and may reset. Please do not
          enter real personal information.
        </div>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/projects" className="flex items-center gap-2 font-display text-xl font-semibold">
              <span aria-hidden className="inline-block h-5 w-5 rounded-md bg-accent" />
              {SITE_NAME}
            </Link>
            <nav aria-label="Main" className="flex items-center gap-5 text-sm">
              <Link href="/projects" className="hover:underline">
                Projects
              </Link>
              <Link href="/instructors" className="hover:underline">
                Instructors
              </Link>
              <Link href="/admin" className="text-muted hover:underline">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          Project Hub reference build. All projects, people and organizations shown are fictional.
        </footer>
      </body>
    </html>
  );
}
