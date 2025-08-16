import { StreamableHTTPTransport } from "@hono/mcp";
import { serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { proxy } from "hono/proxy";

import { env } from "@env";
import { mcpServer } from "@mcp";
import { contextCache } from "./context.js";
import { keygenAuth } from "./middleware/keygen.js";

const app = new Hono();

app.use(contextCache());
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-6",
    keyGenerator: (c) => {
      const id = c.req.header("Authorization");
      if (id) {
        return id;
      }

      return getConnInfo(c).remote.address ?? crypto.randomUUID();
    },
  }),
);

app.get("/health", (c) => {
  return c.text("OK");
});

app.get("/chat/completions", keygenAuth(), async (c) => {
  const { Authorization, ...rest } = c.req.header();

  const res = await proxy(
    `${env.OPENAI_BASE_URL}/chat/completions`,
    {
      headers: {
        Authorization: env.OPENAI_API_KEY,
      },
    },
  );

  return res;
});

app.all("/mcp", keygenAuth(), async (c) => {
  const transport = new StreamableHTTPTransport();
  await mcpServer.connect(transport);
  return transport.handleRequest(c);
});

serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
