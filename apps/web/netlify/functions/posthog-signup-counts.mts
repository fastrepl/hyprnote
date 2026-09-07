import { createClient } from "@supabase/supabase-js";

import { deliverSignupAnalytics } from "../../src/lib/signup-analytics.ts";

function requireEnvironmentVariable(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export default async () => {
  const supabase = createClient(
    requireEnvironmentVariable("SUPABASE_URL"),
    requireEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const delivered = await deliverSignupAnalytics({
    supabase,
    apiKey: requireEnvironmentVariable("VITE_POSTHOG_API_KEY"),
    host: process.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
  });
  console.log(JSON.stringify({ delivered }));
};

export const config = { schedule: "* * * * *" };
