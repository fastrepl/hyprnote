import { App } from "@slack/bolt";

import { env } from "./env";

export const slackApp = new App({
  token: env.SLACK_BOT_TOKEN,
  signingSecret: env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: env.SLACK_APP_TOKEN,
});

export async function startSlackBot() {
  await slackApp.start();
  console.log("Slack bot is running");
}
