import { createBunSandbox, terminateSandbox } from "./sandbox";

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

export async function executeCode(code: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  let sandbox: Awaited<ReturnType<typeof createBunSandbox>> | null = null;

  try {
    sandbox = await createBunSandbox();

    const process = await sandbox.exec(["bun", "eval", code], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      process.stdout.readText(),
      process.stderr.readText(),
    ]);

    const exitCode = await process.wait();
    const executionTimeMs = Date.now() - startTime;

    return {
      success: exitCode === 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    return {
      success: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      executionTimeMs,
    };
  } finally {
    if (sandbox) {
      await terminateSandbox(sandbox);
    }
  }
}
