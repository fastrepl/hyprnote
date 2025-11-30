import { run } from "probot";

import app from "./index.js";

const env: NodeJS.ProcessEnv = {
  ...process.env,
  APP_ID: process.env.GITHUB_BOT_APP_ID ?? process.env.APP_ID,
  PRIVATE_KEY: process.env.GITHUB_BOT_PRIVATE_KEY ?? process.env.PRIVATE_KEY,
  WEBHOOK_SECRET:
    process.env.GITHUB_BOT_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET,
  GITHUB_CLIENT_ID:
    process.env.GITHUB_BOT_CLIENT_ID ?? process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET:
    process.env.GITHUB_BOT_CLIENT_SECRET ?? process.env.GITHUB_CLIENT_SECRET,
};

const requiredEnvVars = ["APP_ID", "PRIVATE_KEY", "WEBHOOK_SECRET"] as const;
for (const key of requiredEnvVars) {
  if (!env[key]) {
    console.error(
      `Missing required environment variable: ${key} (or GITHUB_BOT_${key})`,
    );
    process.exit(1);
  }
}

run(app, { env });
