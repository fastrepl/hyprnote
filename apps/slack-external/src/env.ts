import { createEnv } from "@t3-oss/env-core";

import { slackEnvSchema } from "@hypr/slack-utils";

export const env = createEnv({
  server: {
    ...slackEnvSchema,
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
