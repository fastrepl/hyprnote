import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NANGO_SECRET_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),

    SUPABASE_URL: z.string().min(1),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),

    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_MONTHLY_PRICE_ID: z.string().min(1),
    STRIPE_YEARLY_PRICE_ID: z.string().min(1),

    LOOPS_KEY: z.string().min(1),
  },

  clientPrefix: "VITE_",
  client: {
    VITE_APP_URL: z.string().min(1),
    VITE_SUPABASE_URL: z.string().min(1),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    VITE_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
    VITE_POSTHOG_API_KEY: z.string().optional(),
    VITE_POSTHOG_HOST: z.string().default("https://us.i.posthog.com"),
  },

  runtimeEnv: { ...process.env, ...import.meta.env },
  emptyStringAsUndefined: true,
});
