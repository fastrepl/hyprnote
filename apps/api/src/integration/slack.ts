import { env } from "../env";

interface SlackPostMessageResponse {
  ok: boolean;
  channel?: string;
  ts?: string;
  error?: string;
}

export async function postThreadReply(
  channel: string,
  threadTs: string,
  text: string,
): Promise<SlackPostMessageResponse> {
  if (!env.SLACK_BOT_TOKEN) {
    throw new Error("SLACK_BOT_TOKEN not configured");
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      thread_ts: threadTs,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to post Slack message: ${response.statusText}`);
  }

  return response.json();
}
