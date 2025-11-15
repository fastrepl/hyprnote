import * as Sentry from "@sentry/bun";

Sentry.init({
  dsn: "https://a4abe058104d9e2142abe78f702e3de9@o4506190168522752.ingest.us.sentry.io/4508570874937344",
  sampleRate: 1.0,
});
