import { Probot, Server } from "probot";

import { env } from "./env.js";
import app from "./index.js";

async function start() {
  const server = new Server({
    Probot: Probot.defaults({
      appId: env.GITHUB_BOT_APP_ID,
      privateKey: env.GITHUB_BOT_PRIVATE_KEY,
      secret: env.GITHUB_BOT_WEBHOOK_SECRET,
    }),
  });

  await server.load(app);
  await server.start();
}

start();
