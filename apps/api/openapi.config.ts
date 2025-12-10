import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "apps/api/openapi.json",
  output: "packages/api-client/src/generated",
  parser: {
    filters: {
      tags: {
        include: ["internal"],
      },
    },
  },
});
