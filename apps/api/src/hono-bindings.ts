import type * as Sentry from "@sentry/bun";
import type Stripe from "stripe";

import type { Emitter } from "./observability";

export type AppBindings = {
  Variables: {
    stripeEvent: Stripe.Event;
    stripeRawBody: string;
    stripeSignature: string;
    sentrySpan: Sentry.Span;
    supabaseUserId: string | undefined;
    emit: Emitter;
  };
};
