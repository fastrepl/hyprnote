import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { proxy } from "hono/proxy";
import { z } from "zod";

import { getEnv } from "./env";
import { supabaseMiddleware } from "./middleware/supabase";
import type { Env } from "./types";

const app = new Hono<Env>();
app.use("/v1", supabaseMiddleware());

app.get("/health", (c) => c.text("OK"));
app.get("/", (c) => {
  const allParams = c.req.query();

  return c.render(
    <pre>{JSON.stringify(allParams, null, 2)}</pre>,
  );
});

app.post(
  "/v1/write",
  zValidator(
    "json",
    z.discriminatedUnion("operation", [
      z.object({
        table: z.string(),
        row_id: z.string(),
        operation: z.literal("delete"),
      }),
      z.object({
        table: z.string(),
        row_id: z.string(),
        data: z.record(z.string(), z.unknown()),
        operation: z.literal("update"),
      }),
    ]),
  ),
  async (c) => {
    const supabase = c.get("supabase");
    const user = c.get("user");
    const body = c.req.valid("json");

    // TODO: use RPC / transaction
    if (body.operation === "delete") {
      await supabase.from(body.table).delete().eq("id", body.row_id);
    } else {
      await supabase.from(body.table).upsert({
        ...body.data,
        id: body.row_id,
        user_id: user.id,
      });
    }

    return c.json({ message: "OK" });
  },
);

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
