import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { z } from "zod";

import { env } from "../env";
import type { AppBindings } from "../hono-bindings";
import { stripe } from "../integration/stripe";
import { supabaseAuthMiddleware } from "../middleware/supabase";
import { API_TAGS } from "./constants";

const StartTrialQuerySchema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

const StartTrialResponseSchema = z.object({
  started: z.boolean(),
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
          "application/json": { schema: resolver(StartTrialResponseSchema) },
        },
      },
    },
  }),
  validator("query", StartTrialQuerySchema),
  supabaseAuthMiddleware,
  async (c) => {
    const { interval } = c.req.valid("query");
    const supabase = c.get("supabaseClient")!;
    const userId = c.get("supabaseUserId")!;

    const { data: canTrial, error: trialError } =
      await supabase.rpc("can_start_trial");

    if (trialError || !canTrial) {
      return c.json({ started: false });
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

      const newCustomer = await stripe.customers.create({
        email: user.user?.email,
        metadata: { userId },
      });

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: newCustomer.id })
        .eq("id", userId);

      stripeCustomerId = newCustomer.id;
    }

    const priceId =
      interval === "yearly"
        ? env.STRIPE_YEARLY_PRICE_ID
        : env.STRIPE_MONTHLY_PRICE_ID;

    await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      trial_period_days: 14,
      trial_settings: {
        end_behavior: { missing_payment_method: "cancel" },
      },
    });

    return c.json({ started: true });
  },
);
