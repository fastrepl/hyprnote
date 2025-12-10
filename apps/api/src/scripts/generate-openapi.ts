import { generateSpecs } from "hono-openapi";

import { openAPIDocumentation } from "../openapi";
import { routes } from "../routes";

async function main() {
  const specs = await generateSpecs(routes, {
    documentation: openAPIDocumentation,
  });

  const outputPath = new URL("../../openapi.json", import.meta.url);
  await Bun.write(outputPath, JSON.stringify(specs, null, 2));
  console.log(`OpenAPI spec written to ${outputPath.pathname}`);
}

main();
