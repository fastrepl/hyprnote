import { defineConfig } from "@hey-api/openapi-ts";
import { defaultPlugins } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../../apps/app/server/openapi.gen.json",
  output: "./generated",
  plugins: [...defaultPlugins, "@hey-api/client-fetch"],
});
