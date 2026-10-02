import Link from "next/link";

/** Server-rendered pagination. `hrefFor(page)` builds the URL so any page can reuse it. */
export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  // 1 ... p-1 p p+1 ... N
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);

  const item = "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm";
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={`${item} border-line bg-surface hover:border-accent`}>
          Previous
        </Link>
      ) : null}
      {sorted.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - sorted[i - 1] > 1 ? <span className="px-1 text-muted">…</span> : null}
          {p === page ? (
            <span aria-current="page" className={`${item} border-accent bg-accent text-accent-ink`}>
              {p}
            </span>
          ) : (
            <Link href={hrefFor(p)} className={`${item} border-line bg-surface hover:border-accent`}>
              {p}
            </Link>
          )}
        </span>
      ))}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={`${item} border-line bg-surface hover:border-accent`}>
          Next
        </Link>
      ) : null}
    </nav>
  );
}
