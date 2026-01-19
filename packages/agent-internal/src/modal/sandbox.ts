import type { App, Image, Volume } from "modal";

import { env } from "../env";
import { getModalClient } from "./client";

const APP_NAME = "hypr-slack-internal";
const VOLUME_NAME = "hyprnote-repo-cache";
const VOLUME_MOUNT_PATH = "/vol";
const CACHE_REPO_PATH = `${VOLUME_MOUNT_PATH}/hyprnote`;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const GIT_OPERATION_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
export const REPO_PATH = "/tmp/hyprnote";

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

async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    delayMs: number;
    shouldRetry: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
  },
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.maxRetries && options.shouldRetry(error)) {
        options.onRetry?.(attempt, error);
        await sleep(options.delayMs * attempt);
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

async function execCommand(
  sandbox: BunSandbox,
  args: string[],
  options?: { workdir?: string; timeoutMs?: number },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const process = await sandbox.exec(args, {
    stdout: "pipe",
    stderr: "pipe",
    ...options,
  });
  const [stdout, stderr] = await Promise.all([
    process.stdout.readText(),
    process.stderr.readText(),
  ]);
  const exitCode = await process.wait();
  return { exitCode, stdout, stderr };
}

async function tryRestoreFromCache(sandbox: BunSandbox): Promise<boolean> {
  const { exitCode: cacheCheckCode } = await execCommand(sandbox, [
    "test",
    "-d",
    `${CACHE_REPO_PATH}/.git`,
  ]);
  if (cacheCheckCode !== 0) {
    return false;
  }

  const { exitCode: cpCode } = await execCommand(
    sandbox,
    ["cp", "-a", CACHE_REPO_PATH, REPO_PATH],
    { timeoutMs: GIT_OPERATION_TIMEOUT_MS },
  );
  if (cpCode !== 0) {
    return false;
  }

  const { exitCode: fetchCode } = await execCommand(
    sandbox,
    ["git", "fetch", "origin", "main", "--depth", "1"],
    { workdir: REPO_PATH, timeoutMs: GIT_OPERATION_TIMEOUT_MS },
  );
  if (fetchCode !== 0) {
    await execCommand(sandbox, ["rm", "-rf", REPO_PATH]);
    console.warn("Cache copy or update failed, falling back to fresh clone");
    return false;
  }

  const { exitCode: resetCode } = await execCommand(
    sandbox,
    ["git", "reset", "--hard", "origin/main"],
    { workdir: REPO_PATH },
  );
  if (resetCode !== 0) {
    await execCommand(sandbox, ["rm", "-rf", REPO_PATH]);
    console.warn("Cache copy or update failed, falling back to fresh clone");
    return false;
  }

  return true;
}

async function cloneRepository(sandbox: BunSandbox): Promise<void> {
  const { exitCode, stdout, stderr } = await execCommand(
    sandbox,
    [
      "git",
      "clone",
      "--depth",
      "1",
      "https://github.com/fastrepl/hyprnote.git",
      REPO_PATH,
    ],
    { timeoutMs: GIT_OPERATION_TIMEOUT_MS },
  );

  if (exitCode !== 0) {
    await sandbox.terminate();
    throw new Error(`Git clone failed (exit ${exitCode}): ${stderr || stdout}`);
  }
}

async function updateCache(sandbox: BunSandbox): Promise<void> {
  const { exitCode } = await execCommand(
    sandbox,
    ["cp", "-a", REPO_PATH, CACHE_REPO_PATH],
    { timeoutMs: GIT_OPERATION_TIMEOUT_MS },
  );

  if (exitCode === 0) {
    await execCommand(sandbox, ["sync", VOLUME_MOUNT_PATH]);
  }
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
  return withRetry(() => createBunSandboxInternal(options), {
    maxRetries: MAX_RETRIES,
    delayMs: RETRY_DELAY_MS,
    shouldRetry: isRetryableError,
    onRetry: (attempt, error) => {
      console.warn(
        `Sandbox creation failed (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
        error instanceof Error ? error.message : error,
      );
    },
  });
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

  const restoredFromCache = await tryRestoreFromCache(sandbox);
  if (restoredFromCache) {
    return sandbox;
  }

  await cloneRepository(sandbox);
  await updateCache(sandbox);

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
