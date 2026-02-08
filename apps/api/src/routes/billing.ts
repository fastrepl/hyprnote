import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { z } from "zod";

import { env } from "../env";
import type { AppBindings } from "../hono-bindings";
import { getPricingConfig } from "../integration/pricing-config";
import { stripe } from "../integration/stripe";
import { supabaseAuthMiddleware } from "../middleware/supabase";
import { API_TAGS } from "./constants";

const StartTrialQuerySchema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

const StartTrialResponseSchema = z.object({
  started: z.boolean(),
  reason: z.enum(["started", "not_eligible", "error"]).optional(),
});

export const billing = new Hono<AppBindings>();

billing.post(
  "/start-trial",
  describeRoute({
    tags: [API_TAGS.PRIVATE],
    responses: {
      200: {
        description: "result",
        content: {
          "application/json": {
            schema: resolver(StartTrialResponseSchema),
          },
        },
      },
    },
  }),
  validator("query", StartTrialQuerySchema),
  supabaseAuthMiddleware,
  async (c) => {
    const { interval } = c.req.valid("query");
    const supabase = c.get("supabaseClient");
    if (!supabase) {
      return c.json({ error: "Supabase client missing" }, 500);
    }
    const userId = c.get("supabaseUserId");
    if (!userId) {
      return c.json({ error: "User ID missing" }, 500);
    }

    const { data: canTrial, error: trialError } =
      await supabase.rpc("can_start_trial");

    if (trialError || !canTrial) {
      if (trialError) {
        console.error("can_start_trial RPC failed in start-trial:", trialError);
      }
      const reason = trialError ? "error" : "not_eligible";
      return c.json({ started: false, reason });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id as
      | string
      | null
      | undefined;

    if (!stripeCustomerId) {
      const { data: user } = await supabase.auth.getUser();

      const newCustomer = await stripe.customers.create(
        { email: user.user?.email, metadata: { userId } },
        { idempotencyKey: `create-customer-${userId}` },
      );

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: newCustomer.id })
        .eq("id", userId)
        .is("stripe_customer_id", null);

      const { data: updated } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", userId)
        .single();

      stripeCustomerId = updated?.stripe_customer_id;
    }

    if (!stripeCustomerId) {
      return c.json({ error: "stripe_customer_id_missing" }, 500);
    }

    const pricingConfig = await getPricingConfig();
    const priceId =
      interval === "yearly"
        ? pricingConfig.yearly_price_id
        : pricingConfig.monthly_price_id;

    try {
      await stripe.subscriptions.create(
        {
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          trial_period_days: 14,
          trial_settings: {
            end_behavior: { missing_payment_method: "cancel" },
          },
        },
        {
          idempotencyKey: `trial-${userId}-${new Date().toISOString().slice(0, 10)}`,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? `Failed to create Stripe subscription: ${error.message}`
          : "Failed to create Stripe subscription: unknown error";
      const errorDetails = error instanceof Error ? error.stack : String(error);

      if (env.NODE_ENV !== "production") {
        console.error(errorMessage, errorDetails);
      } else {
        Sentry.captureException(error, {
          tags: {
            billing: "start_trial",
            operation: "create_subscription",
          },
          extra: { userId, stripeCustomerId, priceId, errorDetails },
        });
      }
      return c.json({ error: "failed_to_create_subscription" }, 500);
    }

    return c.json({ started: true, reason: "started" });
  },
);
