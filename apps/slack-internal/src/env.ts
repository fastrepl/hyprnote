import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    SLACK_BOT_TOKEN: z.string().startsWith("xoxb-"),
    SLACK_APP_TOKEN: z.string().startsWith("xapp-"),
    MODAL_TOKEN_ID: z.string().startsWith("ak-"),
    MODAL_TOKEN_SECRET: z.string().startsWith("as-"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
