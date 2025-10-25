import { createClient, type SupabaseClient } from "@supabase/supabase-js";

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
  );

  const user = await authenticateUser(req, supabaseClient);
  if (!user) {
    return new Response("unauthorized", { status: 401 });
  }

  const url = new URL(req.url);

  if (!url.pathname.includes("chat/completions")) {
    return new Response("not_found", { status: 404 });
  }

  const targetUrl = `https://openrouter.ai/api/v1/chat/completions`;

  return fetch(targetUrl, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
    },
    body: req.body,
  });
});

async function authenticateUser(req: Request, supabaseClient: SupabaseClient) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}
