import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { z } from "zod";

import { syncBillingBridge } from "../billing";
import { env } from "../env";
import type { AppBindings } from "../hono-bindings";
import { stripeSync } from "../integration/stripe-sync";
import { API_TAGS } from "./constants";

const WebhookSuccessSchema = z.object({
  ok: z.boolean(),
});

export const webhook = new Hono<AppBindings>();

webhook.post(
  "/stripe",
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
  validator(
    "header",
    z.object({
      "stripe-signature": z.string(),
    }),
  ),
  async (c) => {
    const stripeEvent = c.get("stripeEvent");
    const rawBody = c.get("stripeRawBody");
    const signature = c.get("stripeSignature");
    const span = c.get("sentrySpan");
    span?.setAttribute("stripe.event_type", stripeEvent.type);

    try {
      await stripeSync.processWebhook(rawBody, signature);
    } catch (error) {
      if (env.NODE_ENV !== "production") {
        console.error(error);
      } else {
        if (
          error instanceof Error &&
          error.message === "Unhandled webhook event"
        ) {
          // stripe-sync-engine doesn't support this event type, skip silently
        } else {
          Sentry.captureException(error, {
            tags: { webhook: "stripe", event_type: stripeEvent.type },
          });
          return c.json({ error: "stripe_sync_failed" }, 500);
        }
      }
    }

    try {
      await syncBillingBridge(stripeEvent);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { webhook: "stripe", event_type: stripeEvent.type },
      });
      return c.json({ error: "billing_bridge_sync_failed" }, 500);
    }

    return c.json({ ok: true }, 200);
  },
);
