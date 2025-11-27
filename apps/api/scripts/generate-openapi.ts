import { OpenAPIHono } from "@hono/zod-openapi";
import { writeFile } from "node:fs/promises";
import { stringify } from "yaml";

import { OPENAPI_CONFIG } from "../src/openapi-config";
import {
  chatCompletionsRoute,
  healthRoute,
  listenRoute,
  stripeWebhookRoute,
} from "../src/routes";

const app = new OpenAPIHono();

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  description: "Supabase JWT token",
});

app.openapi(healthRoute, (c) => c.json({ status: "ok" }, 200));
app.openapi(chatCompletionsRoute, async (c) => c.json({}, 200));
app.openapi(stripeWebhookRoute, async (c) => c.json({ ok: true }, 200));
app.openapi(listenRoute, (c) => c.json({}, 200));

const openapi = app.getOpenAPIDocument(OPENAPI_CONFIG);

const yaml = stringify(openapi);
await writeFile("openapi.yaml", yaml, "utf8");

console.log("Generated openapi.yaml");
