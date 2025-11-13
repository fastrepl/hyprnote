import { env } from "@/env";
import { createServerOnlyFn } from "@tanstack/react-start";
import Stripe from "stripe";

export const getStripeClient = createServerOnlyFn(() => {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-10-29.clover",
  });
});
