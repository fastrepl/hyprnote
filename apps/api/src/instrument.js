import * as Sentry from "@sentry/bun";

const isProduction = Bun.env.BUN_ENV === "production";

Sentry.init({
  dsn: Bun.env.SENTRY_DSN,
  environment: isProduction ? "production" : "development",
  release: Bun.env.APP_VERSION
    ? `hyprnote-api@${Bun.env.APP_VERSION}`
    : "hyprnote-api@local",
  sampleRate: 1.0,
  enabled: isProduction || ["true", "1"].includes(Bun.env.LOAD_TEST),
  initialScope: {
    tags: {
      service: "api",
    },
  },
});
