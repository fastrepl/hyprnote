import { createSlackApp } from "@hypr/slack-utils";

import { env } from "./env";

export const app = createSlackApp({
  token: env.SLACK_BOT_TOKEN,
  appToken: env.SLACK_APP_TOKEN,
});
