import { createClient } from "@hey-api/openapi-ts";

async function main() {
  const aiServerUrl = process.env.AI_SERVER_URL || "http://localhost:3001";
  const openapiUrl = `${aiServerUrl}/openapi.json`;

  console.log(`Fetching OpenAPI spec from ${openapiUrl}`);

  try {
    await createClient({
      input: openapiUrl,
      output: "../generated",
    });
    console.log("OpenAPI client generated successfully");
  } catch (error) {
    console.error("Failed to generate OpenAPI client:", error);
    process.exit(1);
  }
}

void main();
