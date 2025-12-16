import * as Sentry from "@sentry/bun";
import { createMiddleware } from "hono/factory";

import type { AppBindings } from "../hono-bindings";

export const sentryMiddleware = createMiddleware<AppBindings>(
  async (c, next) => {
    const sentryTrace = c.req.header("sentry-trace");
    const baggage = c.req.header("baggage");

    return Sentry.continueTrace({ sentryTrace, baggage }, async () => {
      return Sentry.startSpan(
        {
          name: `${c.req.method} ${c.req.path}`,
          op: "http.server",
          attributes: {
            "http.method": c.req.method,
            "http.url": c.req.url,
          },
        },
        async (span) => {
          c.set("sentrySpan", span);
          await next();
          span.setAttribute("http.status_code", c.res.status);
        },
      );
    });
  },
);
