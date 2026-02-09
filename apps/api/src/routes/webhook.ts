import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/zod";
import { z } from "zod";

import { env } from "../env";
import type { AppBindings } from "../hono-bindings";
import { classifyContactStatus, getContactByEmail } from "../integration/loops";
import { postThreadReply } from "../integration/slack";
import { API_TAGS } from "./constants";

const WebhookSuccessSchema = z.object({
  ok: z.boolean(),
});

export const webhook = new Hono<AppBindings>();

const SlackEventSchema = z.object({
  type: z.string(),
  challenge: z.string().optional(),
  event: z
    .object({
      type: z.string(),
      channel: z.string().optional(),
      ts: z.string().optional(),
      text: z.string().optional(),
      bot_id: z.string().optional(),
      user: z.string().optional(),
    })
    .optional(),
});

function extractEmailFromLoopsMessage(text: string): string | null {
  const mailtoMatch = text.match(/<mailto:([^|]+)\|/);
  if (mailtoMatch) {
    return mailtoMatch[1];
  }
  const emailMatch = text.match(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  );
  return emailMatch ? emailMatch[0] : null;
}

webhook.post(
  "/slack/events",
  describeRoute({
    tags: [API_TAGS.PRIVATE_SKIP_OPENAPI],
    responses: {
      200: {
        description: "result",
        content: {
          "application/json": {
            schema: resolver(WebhookSuccessSchema),
          },
        },
      },
      400: { description: "-" },
      500: { description: "-" },
    },
  }),
  async (c) => {
    const rawBody = c.get("slackRawBody");
    const span = c.get("sentrySpan");

    console.log("[slack/events] Received request, rawBody:", rawBody);

    let payload: z.infer<typeof SlackEventSchema>;
    try {
      payload = SlackEventSchema.parse(JSON.parse(rawBody));
    } catch (e) {
      console.log("[slack/events] Failed to parse payload:", e);
      return c.json({ error: "invalid_payload" }, 400);
    }

    console.log("[slack/events] Parsed payload type:", payload.type);

    if (payload.type === "url_verification" && payload.challenge) {
      console.log("[slack/events] URL verification, returning challenge");
      return c.json({ challenge: payload.challenge }, 200);
    }

    if (payload.type !== "event_callback" || !payload.event) {
      return c.json({ ok: true }, 200);
    }

    const event = payload.event;
    span?.setAttribute("slack.event_type", event.type);

    if (event.type !== "message" || !event.bot_id) {
      return c.json({ ok: true }, 200);
    }

    if (
      env.LOOPS_SLACK_CHANNEL_ID &&
      event.channel !== env.LOOPS_SLACK_CHANNEL_ID
    ) {
      return c.json({ ok: true }, 200);
    }

    if (
      !event.text ||
      !event.text.includes("was added to your account") ||
      !event.ts ||
      !event.channel
    ) {
      return c.json({ ok: true }, 200);
    }

    const email = extractEmailFromLoopsMessage(event.text);
    if (!email) {
      return c.json({ ok: true }, 200);
    }

    try {
      const contact = await getContactByEmail(email);
      if (!contact) {
        return c.json({ ok: true }, 200);
      }

      const status = classifyContactStatus(contact);
      const source = contact.source || "Unknown";
      const details = [
        `Source: ${source}`,
        contact.intent ? `Intent: ${contact.intent}` : null,
        contact.platform ? `Platform: ${contact.platform}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      await postThreadReply(
        event.channel,
        event.ts,
        `Status: ${status} (${details})`,
      );
    } catch (error) {
      Sentry.captureException(error, {
        tags: { webhook: "slack", step: "loops_source_thread" },
        extra: { email },
      });
      return c.json({ error: "failed_to_process" }, 500);
    }

    return c.json({ ok: true }, 200);
  },
);
