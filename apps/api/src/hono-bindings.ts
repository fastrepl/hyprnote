import type * as Sentry from "@sentry/bun";
import type Stripe from "stripe";

import type { SupabaseAuthBindings } from "@hypr/supabase/middleware";

import type { Emitter } from "./observability";

export type AppBindings = SupabaseAuthBindings & {
  Variables: SupabaseAuthBindings["Variables"] & {
    stripeEvent: Stripe.Event;
    stripeRawBody: string;
    stripeSignature: string;
    slackRawBody: string;
    slackTimestamp: string;
    sentrySpan: Sentry.Span;
    emit: Emitter;
  };
};
