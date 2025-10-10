import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    SERVER_URL: z.string().url().optional(),
    NANGO_SECRET_KEY: z.string().min(1),
    OPENAI_DEFAULT_MODEL: z.string().min(1),
    OPENAI_BASE_URL: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    SUPABASE_URL: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  },

  clientPrefix: "VITE_",
  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
  },

  runtimeEnv: import.meta.env,

  emptyStringAsUndefined: true,
});
