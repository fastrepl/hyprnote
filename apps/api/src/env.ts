import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.number().default(8787),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    STRIPE_API_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SIGNING_SECRET: z.string().min(1),
    OPENROUTER_API_KEY: z.string().min(1),
    DEEPGRAM_API_KEY: z.string().min(1),
  },
  runtimeEnv: Bun.env,
  emptyStringAsUndefined: true,
});
