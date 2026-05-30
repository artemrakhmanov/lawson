import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Harness pure-TS test runner (R7/B5). Lawguistics has its own `node --test`
// runner and is deliberately excluded here. The `@/` alias mirrors tsconfig.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/lib/services/lawguistics/**", "node_modules/**"],
  },
});
