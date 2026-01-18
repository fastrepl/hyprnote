import { env } from "../env";
import { getModalClient } from "./client";

const APP_NAME = "hypr-slack-internal";
const SANDBOX_TIMEOUT_MS = 60 * 1000;

export async function createBunSandbox() {
  const modal = getModalClient();

  const app = await modal.apps.fromName(APP_NAME, {
    createIfMissing: true,
  });

  const image = modal.images
    .fromRegistry("oven/bun:1.1-alpine")
    .dockerfileCommands([
      "RUN apk add --no-cache curl git",
      "WORKDIR /app",
      "RUN bun add stripe @supabase/supabase-js loops pg",
    ]);

  const sandbox = await modal.sandboxes.create(app, image, {
    timeoutMs: SANDBOX_TIMEOUT_MS,
    env: {
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: env.DATABASE_URL,
      ...(env.LOOPS_API_KEY && { LOOPS_API_KEY: env.LOOPS_API_KEY }),
    },
  });

  return sandbox;
}

export async function terminateSandbox(
  sandbox: Awaited<ReturnType<typeof createBunSandbox>>,
) {
  try {
    await sandbox.terminate();
  } catch (error) {
    console.error("Failed to terminate sandbox:", error);
  }
}
