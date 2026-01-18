import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { executeCode } from "../../modal/execute";

export const executeCodeTool = tool(
  async ({ code }: { code: string }, config?: RunnableConfig) => {
    const threadId = config?.configurable?.thread_id as string | undefined;
    if (!threadId) {
      return JSON.stringify({
        success: false,
        stdout: "",
        stderr: "No thread_id provided in config",
        exitCode: 1,
        executionTimeMs: 0,
      });
    }
    const result = await executeCode(code, threadId);
    return JSON.stringify(result);
  },
  {
    name: "executeCode",
    description:
      "Execute TypeScript/JavaScript code in a sandboxed environment",
    schema: z.object({
      code: z.string().describe("The code to execute"),
    }),
  },
);
