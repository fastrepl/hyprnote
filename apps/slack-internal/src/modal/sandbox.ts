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
    .dockerfileCommands(["RUN apk add --no-cache curl git", "WORKDIR /app"]);

  const sandbox = await modal.sandboxes.create(app, image, {
    timeoutMs: SANDBOX_TIMEOUT_MS,
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
