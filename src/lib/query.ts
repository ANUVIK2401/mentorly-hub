/** URL <-> filter state helpers. All catalog state lives in the URL, so views are shareable and need no client JS. */

export type SearchParams = Record<string, string | string[] | undefined>;

export function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function toPositiveInt(v: string | string[] | undefined, fallback = 1): number {
  const n = Number.parseInt(first(v), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface CatalogParams {
  q: string;
  industry: string;
  tag: string;
  open: boolean;
  view: "grid" | "list";
  page: number;
}

export function parseCatalogParams(sp: SearchParams): CatalogParams {
  return {
    q: first(sp.q).trim().slice(0, 100),
    industry: first(sp.industry),
    tag: first(sp.tag),
    open: first(sp.open) === "1",
    view: first(sp.view) === "list" ? "list" : "grid",
    page: toPositiveInt(sp.page),
  };
}

/** Build an href for the catalog, applying overrides and dropping defaults to keep URLs tidy. */
export function catalogHref(current: CatalogParams, overrides: Partial<CatalogParams> = {}): string {
  const p = { ...current, ...overrides };
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.industry) qs.set("industry", p.industry);
  if (p.tag) qs.set("tag", p.tag);
  if (p.open) qs.set("open", "1");
  if (p.view === "list") qs.set("view", "list");
  if (p.page > 1) qs.set("page", String(p.page));
  const s = qs.toString();
  return s ? `/projects?${s}` : "/projects";
}

/** Generic href builder: drops empty values. */
export function hrefWith(path: string, params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}
