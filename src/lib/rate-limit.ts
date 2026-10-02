/**
 * Fixed-window rate limiter, in process memory.
 *
 * ponytail: the counters live in one server instance. On Vercel each instance counts separately, so the
 * effective limit is roughly (limit x instances). That still blunts a password-guessing loop or form spam
 * from one client. Move the counters to a shared store (a Postgres table or Redis) when abuse is real.
 */
import { createHash } from "node:crypto";
import { headers } from "next/headers";

export interface RateRule {
  /** Name, so different endpoints keep separate counters for the same client. */
  name: string;
  max: number;
  windowMs: number;
}

export const LOGIN_RULE: RateRule = { name: "login", max: 5, windowMs: 60_000 };
export const APPLY_RULE: RateRule = { name: "apply", max: 10, windowMs: 10 * 60_000 };

export interface RateResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const SWEEP_ABOVE = 5_000;

export function createRateLimiter(now: () => number = Date.now) {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    hit(key: string, rule: RateRule): RateResult {
      const t = now();
      const id = `${rule.name}:${key}`;
      let w = windows.get(id);
      if (!w || t - w.start >= rule.windowMs) {
        w = { start: t, count: 0 };
        windows.set(id, w);
        if (windows.size > SWEEP_ABOVE) {
          for (const [k, v] of windows) if (t - v.start >= rule.windowMs) windows.delete(k);
        }
      }
      w.count += 1;
      return w.count <= rule.max
        ? { allowed: true, retryAfterSeconds: 0 }
        : { allowed: false, retryAfterSeconds: Math.ceil((w.start + rule.windowMs - t) / 1000) };
    },
  };
}

declare global {
  var __projectHubLimiter: ReturnType<typeof createRateLimiter> | undefined;
}

/** A stable, non-reversible id for the caller. The raw IP is never stored. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/** Counts one attempt for the current caller. Call before doing the work being limited. */
export async function limitByClient(rule: RateRule): Promise<RateResult> {
  return (globalThis.__projectHubLimiter ??= createRateLimiter()).hit(await clientKey(), rule);
}
