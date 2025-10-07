import { createEnv } from "@t3-oss/env-core";
import type { Context } from "hono";
import { env } from "hono/adapter";
import { z } from "zod";

import type { Env } from "./types";

export const getEnv = (c: Context<Env>) =>
  createEnv({
    server: {
      PORT: z.coerce.number().default(3000),
      OPENAI_DEFAULT_MODEL: z.string().min(1),
      OPENAI_BASE_URL: z.string().min(1),
      OPENAI_API_KEY: z.string().min(1),
      SUPABASE_URL: z.string().min(1),
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    },
    runtimeEnv: env(c) as Record<string, string | undefined>,
    emptyStringAsUndefined: true,
  });
