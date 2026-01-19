import * as Sentry from "@sentry/bun";

const isProduction = Bun.env.BUN_ENV === "production";

Sentry.init({
  dsn: Bun.env.SENTRY_DSN,
  environment: isProduction ? "production" : "development",
  release: Bun.env.GIT_SHA
    ? `slack-internal@${Bun.env.GIT_SHA.slice(0, 7)}`
    : "slack-internal@local",
  sampleRate: 1.0,
  enabled: isProduction,
  initialScope: {
    tags: {
      service: "slack-internal",
    },
  },
});
