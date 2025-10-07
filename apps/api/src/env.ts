import { createEnv } from "@t3-oss/env-core";
import type { Context } from "hono";
import { env } from "hono/adapter";
import { z } from "zod";

export const getEnv = (c: Context) =>
  createEnv({
    server: {
      PORT: z.coerce.number().default(3000),
      OPENAI_DEFAULT_MODEL: z.string().min(1),
      OPENAI_BASE_URL: z.string().min(1),
      OPENAI_API_KEY: z.string().min(1),
      SUPABASE_URL: z.string().min(1),
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    },
    runtimeEnv: env(c),
    emptyStringAsUndefined: true,
  });
