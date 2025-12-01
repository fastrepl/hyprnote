import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup-env.ts"],
    coverage: {
      provider: "v8",
    },
  },
});
