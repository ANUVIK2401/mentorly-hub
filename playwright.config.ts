import { defineConfig } from "@playwright/test";

const PORT = 3100;
const ADMIN_PASSWORD = "e2e-secret";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1, // one shared in-memory server, so run serially
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Optional: point at a system Chromium (CHROMIUM_PATH=/path/to/chrome). Otherwise Playwright's own browser is used.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    // Run `npm run build` first. This serves the production build, which is what Vercel runs.
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/projects`,
    reuseExistingServer: false,
    timeout: 60_000,
    // Empty database URLs keep e2e on the in-memory repository even when `vercel env pull` has put
    // the demo database in .env.local (Next never overrides a variable that is already set).
    env: { ADMIN_PASSWORD, SEED_COUNT: "240", DATABASE_URL: "", POSTGRES_URL: "" },
  },
  metadata: { adminPassword: ADMIN_PASSWORD },
});
