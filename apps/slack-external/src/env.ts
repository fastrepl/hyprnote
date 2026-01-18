import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    SLACK_BOT_TOKEN: z.string().startsWith("xoxb-"),
    SLACK_APP_TOKEN: z.string().startsWith("xapp-"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
