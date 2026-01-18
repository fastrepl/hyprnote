import { runInSandbox } from "./sandbox";

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

export async function executeCode(code: string): Promise<ExecutionResult> {
  try {
    const result = await runInSandbox(undefined, async (sandbox) => {
      const process = await sandbox.exec(["bun", "eval", code], {
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
        data: { stdout: stdout.trim(), stderr: stderr.trim(), exitCode },
      };
    });

    return {
      success: result.success,
      stdout: result.data.stdout,
      stderr: result.data.stderr,
      exitCode: result.data.exitCode,
      executionTimeMs: result.executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs =
      (error as { executionTimeMs?: number }).executionTimeMs ?? 0;
    return {
      success: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      executionTimeMs,
    };
  }
}
