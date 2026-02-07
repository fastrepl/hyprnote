import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../../apps/ai/openapi.gen.json",
  output: "src/generated",
});
