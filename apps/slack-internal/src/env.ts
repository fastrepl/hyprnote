import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    SLACK_BOT_TOKEN: z.string(),
    SLACK_APP_TOKEN: z.string(),
    AGENT_CHANNEL_MAP: z.string().optional().default("{}"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
