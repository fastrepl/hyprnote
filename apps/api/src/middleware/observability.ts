import * as Sentry from "@sentry/bun";
import { createMiddleware } from "hono/factory";

import type { AppBindings } from "../hono-bindings";
import {
  type Emitter,
  handlePosthog,
  handleSentry,
  type ObservabilityEvent,
} from "../observability";

const emit: Emitter = (event: ObservabilityEvent) => {
  try {
    handlePosthog(event);
  } catch (e) {
    Sentry.captureException(e, { extra: { event, handler: "posthog" } });
  }

  try {
    handleSentry(event);
  } catch (e) {
    Sentry.captureException(e, { extra: { event, handler: "sentry" } });
  }
};

export const observabilityMiddleware = createMiddleware<AppBindings>(
  async (c, next) => {
    c.set("emit", emit);
    await next();
  },
);
