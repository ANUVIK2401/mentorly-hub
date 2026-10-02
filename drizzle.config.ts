import { defineConfig } from "drizzle-kit";

// `npm run db:generate` needs no database. `db:push` / `db:migrate` need DATABASE_URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://localhost:5432/project_hub" },
});
