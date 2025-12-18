import * as Sentry from "@sentry/bun";
import { createMiddleware } from "hono/factory";

import { env } from "../env";

export const verifySlackWebhook = createMiddleware<{
  Variables: {
    slackRawBody: string;
    slackTimestamp: string;
  };
}>(async (c, next) => {
  console.log("[slack middleware] Starting verification");

  if (!env.SLACK_SIGNING_SECRET) {
    console.log("[slack middleware] SLACK_SIGNING_SECRET not configured");
    return c.text("slack_signing_secret_not_configured", 500);
  }

  const signature = c.req.header("X-Slack-Signature");
  const timestamp = c.req.header("X-Slack-Request-Timestamp");

  console.log("[slack middleware] signature:", signature);
  console.log("[slack middleware] timestamp:", timestamp);

  if (!signature || !timestamp) {
    console.log("[slack middleware] Missing signature or timestamp");
    return c.text("missing_slack_signature", 400);
  }

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (Number.parseInt(timestamp) < fiveMinutesAgo) {
    console.log("[slack middleware] Request too old, timestamp:", timestamp);
    return c.text("slack_request_too_old", 400);
  }

  const body = await c.req.text();
  console.log("[slack middleware] Request body:", body);

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
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(sigBaseString),
    );
    const computedSignature = `v0=${Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;

    console.log("[slack middleware] computedSignature:", computedSignature);
    console.log("[slack middleware] receivedSignature:", signature);

    if (computedSignature !== signature) {
      console.log("[slack middleware] Signature mismatch!");
      return c.text("invalid_slack_signature", 400);
    }

    console.log("[slack middleware] Signature verified, proceeding");
    c.set("slackRawBody", body);
    c.set("slackTimestamp", timestamp);
    await next();
  } catch (err) {
    console.log("[slack middleware] Error during verification:", err);
    Sentry.captureException(err, {
      tags: { webhook: "slack", step: "signature_verification" },
    });
    const message = err instanceof Error ? err.message : "unknown_error";
    return c.text(message, 400);
  }
});
