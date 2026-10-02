const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Postgres rejects a malformed uuid with an error (a 500); callers check first and answer "not found". */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
