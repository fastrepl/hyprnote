import pluginQuery from "@tanstack/eslint-plugin-query";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["**/target/**", "**/dist/**", "**/node_modules/**"],
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "apps/desktop/**/*.{ts,tsx}"],
    extends: [
      tseslint.configs.base,
      ...pluginQuery.configs["flat/recommended"],
    ],
  },
);
