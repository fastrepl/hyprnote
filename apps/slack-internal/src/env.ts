import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    SLACK_BOT_TOKEN: z.string(),
    SLACK_APP_TOKEN: z.string(),
    MODAL_TOKEN_ID: z.string(),
    MODAL_TOKEN_SECRET: z.string(),
    OPENROUTER_API_KEY: z.string(),
    STRIPE_SECRET_KEY: z.string(),
    SUPABASE_URL: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    DATABASE_URL: z.string(),
    LOOPS_API_KEY: z.string().optional(),
    JINA_API_KEY: z.string().optional(),
    LANGSMITH_API_KEY: z.string().optional(),
    LANGSMITH_ORG_ID: z.string().optional(),
    LANGSMITH_PROJECT: z.string().optional().default("slack-internal"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
