import * as Sentry from "@sentry/bun";
import { createMiddleware } from "hono/factory";

export const sentryMiddleware = createMiddleware(async (c, next) => {
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
        await next();
        span.setAttribute("http.status_code", c.res.status);
      },
    );
  });
});
