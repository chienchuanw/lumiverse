import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.steps.ts"],
    environment: "node",
    // DB-backed tests share a single test database; run files serially so they
    // don't truncate each other's data.
    fileParallelism: false,
  },
});
