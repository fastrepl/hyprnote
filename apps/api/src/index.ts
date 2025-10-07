import { Hono } from "hono";
import { proxy } from "hono/proxy";

import { getEnv } from "./env";
import { supabaseMiddleware } from "./middleware/supabase";

const app = new Hono();
app.use("/v1", supabaseMiddleware());

app.get("/health", (c) => c.text("OK"));

app.post("/v1/write", async (c) => {
  return c.json({ message: "OK" });
});

app.post("/v1/chat/completions", async (c) => {
  const { OPENAI_BASE_URL, OPENAI_DEFAULT_MODEL, OPENAI_API_KEY } = getEnv(c);

  const data = await c.req.json();

  const res = await proxy(
    `${OPENAI_BASE_URL}/chat/completions`,
    {
      method: "POST",
      body: JSON.stringify({
        ...data,
        model: OPENAI_DEFAULT_MODEL,
      }),
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    },
  );

  return res;
});

export default app;
