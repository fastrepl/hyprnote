import "./instrument";

import { apiReference } from "@scalar/hono-api-reference";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import { bodyLimit } from "hono/body-limit";
import { websocket } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { env } from "./env";
import type { AppBindings } from "./hono-bindings";
import {
  loadTestOverride,
  observabilityMiddleware,
  sentryMiddleware,
  supabaseAuthMiddleware,
  verifyStripeWebhook,
} from "./middleware";
import { API_TAGS, routes } from "./routes";

const app = new Hono<AppBindings>();

app.use(sentryMiddleware);
app.use(observabilityMiddleware);
app.use(logger());
app.use(bodyLimit({ maxSize: 1024 * 1024 * 5 }));

const corsMiddleware = cors({
  origin: "*",
  allowHeaders: [
    "authorization",
    "x-client-info",
    "apikey",
    "content-type",
    "user-agent",
    "sentry-trace",
    "baggage",
  ],
  allowMethods: ["GET", "POST", "OPTIONS"],
});

app.use("*", (c, next) => {
  if (c.req.path === "/listen") {
    return next();
  }
  return corsMiddleware(c, next);
});

app.use("/chat/completions", loadTestOverride, supabaseAuthMiddleware);
app.use("/webhook/stripe", verifyStripeWebhook);

if (env.NODE_ENV !== "development") {
  app.use("/listen", loadTestOverride, supabaseAuthMiddleware);
  app.use("/transcribe", loadTestOverride, supabaseAuthMiddleware);
}

app.route("/", routes);

app.onError((err, c) => {
  Sentry.captureException(err, {
    extra: { path: c.req.path, method: c.req.method },
  });
  return c.json({ error: "internal_server_error" }, 500);
});

app.notFound((c) => c.text("not_found", 404));

app.get(
  "/openapi.json",
  openAPISpecs(routes, {
    documentation: {
      openapi: "3.1.0",
      info: {
        title: "Hyprnote API",
        version: "1.0.0",
        description:
          "API for Hyprnote - AI-powered meeting notes application. APIs are categorized by tags: 'internal' for health checks and internal use, 'app' for endpoints used by the Hyprnote application (requires authentication), and 'webhook' for external service callbacks.",
      },
      tags: [
        {
          name: API_TAGS.INTERNAL,
          description: "Internal endpoints for health checks and monitoring",
        },
        {
          name: API_TAGS.APP,
          description:
            "Endpoints used by the Hyprnote application. Requires Supabase authentication.",
        },
        {
          name: API_TAGS.WEBHOOK,
          description: "Webhook endpoints for external service callbacks",
        },
      ],
      components: {
        securitySchemes: {
          Bearer: {
            type: "http",
            scheme: "bearer",
            description: "Supabase JWT token",
          },
        },
      },
      servers: [
        {
          url: "https://api.hyprnote.com",
          description: "Production server",
        },
        {
          url: "http://localhost:4000",
          description: "Local development server",
        },
      ],
    },
  }),
);

app.get(
  "/docs",
  apiReference({
    theme: "saturn",
    spec: {
      url: "/openapi.json",
    },
  }),
);

export default {
  port: env.PORT,
  fetch: app.fetch,
  websocket,
};
