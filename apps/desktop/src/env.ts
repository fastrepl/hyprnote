import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_APP_URL: z.string().min(1).optional(),
    VITE_SUPABASE_URL: z.string().min(1).optional(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    VITE_PRO_PRODUCT_ID: z.string().min(1).optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
