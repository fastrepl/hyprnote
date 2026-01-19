import type { App, Image, Volume } from "modal";

import { env } from "../env";
import { getModalClient } from "./client";

const APP_NAME = "hypr-slack-internal";
const VOLUME_NAME = "hyprnote-repo-cache";
const VOLUME_MOUNT_PATH = "/vol";
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
export const REPO_PATH = `${VOLUME_MOUNT_PATH}/hyprnote`;

export type BunSandbox = Awaited<ReturnType<typeof createBunSandbox>>;

let cachedApp: App | null = null;
let cachedImage: Image | null = null;
let cachedVolume: Volume | null = null;

async function getAppImageAndVolume(): Promise<{
  app: App;
  image: Image;
  volume: Volume;
}> {
  if (cachedApp && cachedImage && cachedVolume) {
    return { app: cachedApp, image: cachedImage, volume: cachedVolume };
  }

  const modal = getModalClient();

  cachedApp = await modal.apps.fromName(APP_NAME, {
    createIfMissing: true,
  });

  cachedImage = modal.images
    .fromRegistry("oven/bun:1.3-debian")
    .dockerfileCommands([
      "RUN apt-get update && apt-get install -y curl git bash npm && rm -rf /var/lib/apt/lists/*",
      "RUN npm install -g @anthropic-ai/claude-code",
      "WORKDIR /app",
      "RUN bun add stripe @supabase/supabase-js loops pg posthog-node",
    ]);

  cachedVolume = await modal.volumes.fromName(VOLUME_NAME, {
    createIfMissing: true,
  });

  return { app: cachedApp, image: cachedImage, volume: cachedVolume };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("rst_stream") ||
      message.includes("internal") ||
      message.includes("unavailable") ||
      message.includes("deadline") ||
      message.includes("connection")
    );
  }
  return false;
}

class SandboxManager {
  async create(options?: CreateBunSandboxOptions): Promise<BunSandbox> {
    return await createBunSandbox(options);
  }

  async release(sandbox: BunSandbox): Promise<void> {
    await terminateSandbox(sandbox);
  }
}

export const sandboxManager = new SandboxManager();

interface CreateBunSandboxOptions {
  timeoutMs?: number;
}

export async function createBunSandbox(options?: CreateBunSandboxOptions) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await createBunSandboxInternal(options);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES && isRetryableError(error)) {
        console.warn(
          `Sandbox creation failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
          error instanceof Error ? error.message : error,
        );
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

async function createBunSandboxInternal(options?: CreateBunSandboxOptions) {
  const { app, image, volume } = await getAppImageAndVolume();
  const modal = getModalClient();

  const sandbox = await modal.sandboxes.create(app, image, {
    verbose: true,
    timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    volumes: {
      [VOLUME_MOUNT_PATH]: volume,
    },
    env: {
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: env.DATABASE_URL,
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      ...(env.LOOPS_API_KEY && { LOOPS_API_KEY: env.LOOPS_API_KEY }),
      ...(env.POSTHOG_API_KEY && { POSTHOG_API_KEY: env.POSTHOG_API_KEY }),
      ...(env.POSTHOG_HOST && { POSTHOG_HOST: env.POSTHOG_HOST }),
    },
  });

  const repoExistsProcess = await sandbox.exec(
    ["test", "-d", `${REPO_PATH}/.git`],
    { stdout: "pipe", stderr: "pipe" },
  );
  const repoExistsExitCode = await repoExistsProcess.wait();
  const repoExists = repoExistsExitCode === 0;

  if (repoExists) {
    const fetchProcess = await sandbox.exec(
      ["git", "fetch", "origin", "main", "--depth", "1"],
      { stdout: "pipe", stderr: "pipe", workdir: REPO_PATH },
    );
    const fetchExitCode = await fetchProcess.wait();

    if (fetchExitCode === 0) {
      const resetProcess = await sandbox.exec(
        ["git", "reset", "--hard", "origin/main"],
        { stdout: "pipe", stderr: "pipe", workdir: REPO_PATH },
      );
      const resetExitCode = await resetProcess.wait();

      if (resetExitCode === 0) {
        const syncProcess = await sandbox.exec(["sync", VOLUME_MOUNT_PATH], {
          stdout: "pipe",
          stderr: "pipe",
        });
        await syncProcess.wait();
        return sandbox;
      }
    }

    console.warn("Git fetch/reset failed, falling back to fresh clone");
    const rmProcess = await sandbox.exec(["rm", "-rf", REPO_PATH], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await rmProcess.wait();
  }

  const cloneProcess = await sandbox.exec(
    [
      "git",
      "clone",
      "--depth",
      "1",
      "https://github.com/fastrepl/hyprnote.git",
      REPO_PATH,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );

  const [cloneStdout, cloneStderr] = await Promise.all([
    cloneProcess.stdout.readText(),
    cloneProcess.stderr.readText(),
  ]);

  const cloneExitCode = await cloneProcess.wait();
  if (cloneExitCode !== 0) {
    await sandbox.terminate();
    throw new Error(
      `Git clone failed (exit ${cloneExitCode}): ${cloneStderr || cloneStdout}`,
    );
  }

  const syncProcess = await sandbox.exec(["sync", VOLUME_MOUNT_PATH], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await syncProcess.wait();

  return sandbox;
}

export async function terminateSandbox(sandbox: BunSandbox) {
  try {
    await sandbox.terminate();
  } catch (error) {
    console.error("Failed to terminate sandbox:", error);
  }
}

export interface SandboxRunResult<T> {
  success: boolean;
  data: T;
  executionTimeMs: number;
}

export async function runInSandbox<T>(
  options: CreateBunSandboxOptions | undefined,
  fn: (sandbox: BunSandbox) => Promise<{ success: boolean; data: T }>,
): Promise<SandboxRunResult<T>> {
  const startTime = Date.now();
  let sandbox: BunSandbox | null = null;

  try {
    sandbox = await createBunSandbox(options);
    const result = await fn(sandbox);
    return {
      success: result.success,
      data: result.data,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    throw Object.assign(
      error instanceof Error ? error : new Error(String(error)),
      {
        executionTimeMs: Date.now() - startTime,
      },
    );
  } finally {
    if (sandbox) {
      await terminateSandbox(sandbox);
    }
  }
}
