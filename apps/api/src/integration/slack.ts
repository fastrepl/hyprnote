import { env } from "../env";

interface SlackPostMessageResponse {
  ok: boolean;
  channel?: string;
  ts?: string;
  error?: string;
}

const SLACK_TIMEOUT_MS = 5000;

export async function postThreadReply(
  channel: string,
  threadTs: string,
  text: string,
): Promise<SlackPostMessageResponse> {
  if (!env.SLACK_BOT_TOKEN) {
    throw new Error("SLACK_BOT_TOKEN not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);

  try {
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
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to post Slack message: ${response.status} ${response.statusText}`);
    }

    const result: SlackPostMessageResponse = await response.json();

    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || "unknown error"}`);
    }

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Slack API request timed out after ${SLACK_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
