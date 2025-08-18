import { StreamableHTTPTransport } from "@hono/mcp";
import { serve } from "@hono/node-server";
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { logger } from "hono/logger";
import { proxy } from "hono/proxy";

import { contextCache } from "./context.js";
import { env } from "./env.js";
import { mcpServer } from "./mcp.js";
import { HEADER_KEYGEN, keygenAuth } from "./middleware/keygen.js";

const app = new Hono();

app.use(logger());
app.use(contextCache());

const apiRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-6",
  keyGenerator: (c) => {
    const id = c.req.header(HEADER_KEYGEN);
    if (id) {
      return id;
    }

    return getConnInfo(c).remote.address ?? crypto.randomUUID();
  },
});

app.get("/health", (c) => {
  return c.text("OK");
});

app.post("/chat/completions", apiRateLimit, keygenAuth(), async (c) => {
  const data = await c.req.json();
  const res = await proxy(
    `${env.OPENAI_BASE_URL}/chat/completions`,
    {
      method: "POST",
      body: JSON.stringify({
        ...data,
        model: env.OPENAI_DEFAULT_MODEL,
      }),
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
    },
  );

  return res;
});

app.all("/mcp", apiRateLimit, keygenAuth(), async (c) => {
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
