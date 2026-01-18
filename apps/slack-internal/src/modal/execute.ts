import { sandboxManager } from "./sandbox";

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

export async function executeCode(
  code: string,
  threadId: string,
): Promise<ExecutionResult> {
  const startTime = Date.now();

  try {
    const sandbox = await sandboxManager.getOrCreate(threadId);

    const process = await sandbox.exec(["bun", "-e", code], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      process.stdout.readText(),
      process.stderr.readText(),
    ]);

    const exitCode = await process.wait();

    return {
      success: exitCode === 0,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
