// Setup dummy environment variables for tests
// These must be set before any modules that use env.ts are imported
process.env.GITHUB_BOT_APP_ID ??= "1";
process.env.GITHUB_BOT_PRIVATE_KEY ??= "dummy-private-key";
process.env.GITHUB_BOT_WEBHOOK_SECRET ??= "dummy-secret";
process.env.DEVIN_API_KEY ??= "dummy-devin-api-key";
