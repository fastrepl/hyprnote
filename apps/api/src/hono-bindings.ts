import type * as Sentry from "@sentry/bun";
import type Stripe from "stripe";

export type AppBindings = {
  Variables: {
    stripeEvent: Stripe.Event;
    stripeRawBody: string;
    stripeSignature: string;
    sentrySpan: Sentry.Span;
  };
};
