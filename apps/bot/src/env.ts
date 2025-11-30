import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    GITHUB_BOT_APP_ID: z.coerce.number().int().positive(),
    GITHUB_BOT_PRIVATE_KEY: z.string().min(1),
    GITHUB_BOT_WEBHOOK_SECRET: z.string().min(1),
    GITHUB_BOT_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_BOT_CLIENT_SECRET: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
