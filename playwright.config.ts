import { defineConfig } from "@playwright/test";

// E2E smoke tests. Not part of CI yet — they need a Postgres database and a
// running app. Run locally with:
//   pnpm exec playwright install chromium
//   DATABASE_URL=... pnpm test:e2e
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
