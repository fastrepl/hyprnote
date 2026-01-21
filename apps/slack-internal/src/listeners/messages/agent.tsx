import type { App } from "@slack/bolt";

import { handleAgentMessage, shouldIgnoreMessage } from "./handler";

export function registerAgentMessage(app: App) {
  app.event("app_mention", async ({ event, say, client, logger }) => {
    const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();

    if (!text || shouldIgnoreMessage(text)) {
      return;
    }

    const threadTs = event.thread_ts ?? event.ts;
    const isFirstMessage = !event.thread_ts;

    await handleAgentMessage({
      text,
      rawText: event.text,
      threadTs,
      eventTs: event.ts,
      channel: event.channel,
      userId: event.user,
      isFirstMessage,
      useSimpleExitBlock: true,
      client,
      say,
      logger,
    });
  });

  app.message(async ({ message, say, client, logger, context }) => {
    if ("bot_id" in message) return;
    if (!("text" in message) || !message.text) return;

    const text = message.text.trim();
    if (!text) return;
    if (shouldIgnoreMessage(text)) return;

    const isDM = message.channel_type === "im";
    const isThreadReply = "thread_ts" in message && message.thread_ts;

    if (!isDM && !isThreadReply) return;

    if (isThreadReply && !isDM) {
      const parentResult = await client.conversations.history({
        channel: message.channel,
        latest: message.thread_ts as string,
        inclusive: true,
        limit: 1,
      });

      const parentMessage = parentResult.messages?.[0];
      const botUserId = context.botUserId;

      if (!parentMessage?.text?.includes(`<@${botUserId}>`)) {
        return;
      }
    }

    const threadTs =
      "thread_ts" in message ? (message.thread_ts ?? message.ts) : message.ts;
    const isFirstMessage = !isThreadReply;
    const userId = "user" in message ? message.user : undefined;

    await handleAgentMessage({
      text,
      rawText: message.text,
      threadTs,
      eventTs: threadTs,
      channel: message.channel,
      userId,
      isFirstMessage,
      useSimpleExitBlock: false,
      client,
      say,
      logger,
    });
  });
}
