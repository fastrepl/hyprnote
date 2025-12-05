import type * as Sentry from "@sentry/bun";
import type Stripe from "stripe";

export type AppBindings = {
  Variables: {
    stripeEvent: Stripe.Event;
    sentrySpan: Sentry.Span;
  };
};
