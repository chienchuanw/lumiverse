import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.steps.ts"],
    environment: "node",
    // DB-backed tests share a single test database; run files serially so they
    // don't truncate each other's data.
    fileParallelism: false,
  },
});
