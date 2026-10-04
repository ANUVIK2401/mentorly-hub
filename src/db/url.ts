/**
 * The app's Postgres connection string. No imports, so the root layout can read it without
 * pulling the driver into its bundle.
 *
 * DATABASE_URL wins when set. POSTGRES_URL is the pooled (port 6543) string that the Vercel
 * Supabase integration creates; it never creates DATABASE_URL.
 */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}
