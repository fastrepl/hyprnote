import { env } from "../env";
import { getModalClient } from "./client";

const APP_NAME = "hypr-slack-internal";
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
export const REPO_PATH = "/app/hyprnote";

export type BunSandbox = Awaited<ReturnType<typeof createBunSandbox>>;

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
  const modal = getModalClient();

  const app = await modal.apps.fromName(APP_NAME, {
    createIfMissing: true,
  });

  const image = modal.images
    .fromRegistry("oven/bun:1.3-debian")
    .dockerfileCommands([
      "RUN apt-get update && apt-get install -y curl git bash npm && rm -rf /var/lib/apt/lists/*",
      "RUN npm install -g @anthropic-ai/claude-code",
      "WORKDIR /app",
      "RUN bun add stripe @supabase/supabase-js loops pg",
    ]);

  const sandbox = await modal.sandboxes.create(app, image, {
    verbose: true,
    timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    env: {
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: env.DATABASE_URL,
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      ...(env.LOOPS_API_KEY && { LOOPS_API_KEY: env.LOOPS_API_KEY }),
    },
  });

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
