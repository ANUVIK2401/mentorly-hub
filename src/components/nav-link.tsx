"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Header link that marks the section you are in (aria-current plus a navy fill). */
export function NavLink({ href, children, quiet = false }: { href: string; children: React.ReactNode; quiet?: boolean }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3.5 py-1.5 transition-colors duration-150 ${
        active
          ? "bg-accent text-accent-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
          : quiet
            ? "text-muted hover:bg-white/70 hover:text-accent"
            : "font-medium text-ink hover:bg-white/70 hover:text-accent"
      }`}
    >
      {children}
    </Link>
  );
}
