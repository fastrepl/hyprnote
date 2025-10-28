import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "supabase-js";

const app = new Hono().basePath("/llm");

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["authorization", "x-client-info", "apikey", "content-type", "user-agent"],
    allowMethods: ["POST", "GET", "OPTIONS"],
  }),
);

app.use("*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.text("unauthorized", 401);
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    return c.text("unauthorized", 401);
  }

  await next();
});

app.post("/chat/completions", async (c) => {
  const requestBody = await c.req.json();

  const needsToolCalling = requestBody.tools && requestBody.tool_choice !== "none";

  const modelsToUse = needsToolCalling
    ? ["anthropic/claude-haiku-4.5", "openai/gpt-oss-120b:nitro"]
    : ["openai/chatgpt-4o-latest", "moonshotai/kimi-k2-0905:nitro"];

  const { model: _, ...bodyWithoutModel } = requestBody;

  const modifiedBody = {
    ...bodyWithoutModel,
    models: modelsToUse,
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
    },
    body: JSON.stringify(modifiedBody),
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  });
});

app.notFound((c) => c.text("not_found", 404));

Deno.serve(app.fetch);
