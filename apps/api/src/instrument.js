import * as Sentry from "@sentry/bun";

Sentry.init({
  dsn: Bun.env.SENTRY_DSN,
  release: `hyprnote-api@${Bun.env.APP_REVISION ?? "local"}`,
  sampleRate: 1.0,
  enabled: ["true", "1"].includes(Bun.env.LOAD_TEST),
});
