import { REPO_PATH, runInSandbox } from "./sandbox";

export interface UnderstandResult {
  success: boolean;
  report: string;
  executionTimeMs: number;
}

export async function understandHyprnoteRepo(
  request: string,
): Promise<UnderstandResult> {
  try {
    const result = await runInSandbox(
      { timeoutMs: 5 * 60 * 1000 },
      async (sandbox) => {
        const claudeProcess = await sandbox.exec(
          [
            "/root/.claude/local/claude",
            "-p",
            request,
            "--tools",
            "Read,Grep,Glob,LS",
            "--output-format",
            "text",
          ],
          {
            stdout: "pipe",
            stderr: "pipe",
            workdir: REPO_PATH,
          },
        );

        const [stdout, stderr] = await Promise.all([
          claudeProcess.stdout.readText(),
          claudeProcess.stderr.readText(),
        ]);

        const exitCode = await claudeProcess.wait();

        return {
          success: exitCode === 0,
          data: {
            report:
              exitCode === 0
                ? stdout.trim()
                : stderr || stdout || "Unknown error",
          },
        };
      },
    );

    return {
      success: result.success,
      report: result.data.report,
      executionTimeMs: result.executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs =
      (error as { executionTimeMs?: number }).executionTimeMs ?? 0;
    return {
      success: false,
      report: error instanceof Error ? error.message : String(error),
      executionTimeMs,
    };
  }
}
