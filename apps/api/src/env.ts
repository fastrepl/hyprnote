import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.coerce.number().default(8787),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    LOAD_TEST: z.coerce.boolean().default(false),
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    OPENROUTER_API_KEY: z.string().min(1),
    DEEPGRAM_API_KEY: z.string().min(1),
    ASSEMBLYAI_API_KEY: z.string().min(1),
    SONIOX_API_KEY: z.string().min(1),
    POSTHOG_API_KEY: z.string().min(1),
    OVERRIDE_AUTH: z.string().optional(),
  },
  runtimeEnv: Bun.env,
  emptyStringAsUndefined: true,
});
