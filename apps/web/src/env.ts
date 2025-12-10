import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const isCI = process.env.CI === "true";
const isDev = process.env.NODE_ENV === "development";

export const env = createEnv({
  server: {
    NANGO_SECRET_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),

    SUPABASE_URL: z.string().min(1),
    SUPABASE_ANON_KEY: z.string().min(1),

    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_MONTHLY_PRICE_ID: z.string().min(1),
    STRIPE_YEARLY_PRICE_ID: z.string().min(1),

    LOOPS_KEY: z.string().min(1),

    DEEPGRAM_API_KEY: z.string().min(1),

    RESTATE_INGRESS_URL: z.string().min(1),

    GITHUB_TOKEN: z.string().optional(),
  },

  clientPrefix: "VITE_",
  client: {
    VITE_APP_URL: z.string().min(1),
    VITE_API_URL: z.string().default("https://api.hyprnote.com"),
    VITE_SUPABASE_URL: z.string().min(1),
    VITE_SUPABASE_ANON_KEY: z.string().min(1),
    VITE_POSTHOG_API_KEY: isDev ? z.string().optional() : z.string().min(1),
    VITE_POSTHOG_HOST: z.string().default("https://us.i.posthog.com"),
    VITE_SENTRY_DSN: z.string().min(1).optional(),
    VITE_APP_VERSION: z.string().min(1).optional(),
  },

  runtimeEnv: { ...process.env, ...import.meta.env },
  emptyStringAsUndefined: true,
  skipValidation: isCI,
});
