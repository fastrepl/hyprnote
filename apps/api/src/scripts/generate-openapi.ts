import { createClient } from "@hey-api/openapi-ts";
import { generateSpecs } from "hono-openapi";

import { openAPIDocumentation } from "../openapi";
import { routes } from "../routes";
import { API_TAGS } from "../routes/constants";

async function main() {
  const specs = await generateSpecs(routes, {
    documentation: openAPIDocumentation,
  });

  const outputPath = new URL("../../openapi.gen.json", import.meta.url);
  await Bun.write(outputPath, JSON.stringify(specs, null, 2));
  console.log(`OpenAPI spec written to ${outputPath.pathname}`);

  try {
    await createClient({
      input: "./openapi.gen.json",
      output: "../../packages/api-client/src/generated",
      parser: {
        filters: {
          tags: {
            include: [API_TAGS.PRIVATE],
          },
        },
      },
    });
    console.log("OpenAPI client generated successfully");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
