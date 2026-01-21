import { tool } from "@langchain/core/tools";
import { WebClient } from "@slack/web-api";
import { z } from "zod";

import { env } from "../env";
import {
  fetchSlackThread,
  formatThreadContent,
  parseSlackMessageLinks,
} from "../utils/slack-message-reader";

const client = new WebClient(env.SLACK_BOT_TOKEN);

export const readSlackMessageTool = tool(
  async ({ url }: { url: string }) => {
    const links = parseSlackMessageLinks(url);

    if (links.length === 0) {
      return "Invalid Slack message URL. Expected format: https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP";
    }

    const link = links[0];
    const threadTs = link.threadTs || link.ts;

    const thread = await fetchSlackThread(
      client,
      link.channel,
      threadTs,
      env.SLACK_BOT_TOKEN,
    );

    if (!thread) {
      return "Could not fetch the Slack message. The bot may not have access to this channel.";
    }

    return formatThreadContent(thread);
  },
  {
    name: "readSlackMessage",
    description:
      "Read a Slack message and its entire thread by URL. Returns the parent message and all replies, including any files, canvases, and URLs found in the messages. Use this when you encounter a Slack message URL and need to read its content.",
    schema: z.object({
      url: z
        .string()
        .describe(
          "The Slack message URL (e.g., https://workspace.slack.com/archives/C123ABC456/p1234567890123456)",
        ),
    }),
  },
);
