import * as Sentry from "@sentry/bun";
import { createMiddleware } from "hono/factory";

import { env } from "../env";

export const verifySlackWebhook = createMiddleware<{
  Variables: {
    slackRawBody: string;
    slackTimestamp: string;
  };
}>(async (c, next) => {
  if (!env.SLACK_SIGNING_SECRET) {
    return c.text("slack_signing_secret_not_configured", 500);
  }

  const signature = c.req.header("X-Slack-Signature");
  const timestamp = c.req.header("X-Slack-Request-Timestamp");

  if (!signature || !timestamp) {
    return c.text("missing_slack_signature", 400);
  }

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (Number.parseInt(timestamp) < fiveMinutesAgo) {
    return c.text("slack_request_too_old", 400);
  }

  const body = await c.req.text();

  try {
    const sigBaseString = `v0:${timestamp}:${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.SLACK_SIGNING_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(sigBaseString));
    const computedSignature = `v0=${Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;

    if (computedSignature !== signature) {
      return c.text("invalid_slack_signature", 400);
    }

    c.set("slackRawBody", body);
    c.set("slackTimestamp", timestamp);
    await next();
  } catch (err) {
    Sentry.captureException(err, {
      tags: { webhook: "slack", step: "signature_verification" },
    });
    const message = err instanceof Error ? err.message : "unknown_error";
    return c.text(message, 400);
  }
});
