import { defineConfig } from "drizzle-kit";

// `npm run db:generate` needs no database. `db:push` / `db:migrate` need DATABASE_URL, or the
// POSTGRES_URL_NON_POOLING that the Vercel Supabase integration creates (migrations should not go
// through the transaction pooler).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url:
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      "postgres://localhost:5432/project_hub" },
});
