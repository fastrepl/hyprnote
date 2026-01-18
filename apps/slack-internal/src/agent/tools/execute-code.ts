import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { executeCode, formatExecutionResult } from "../../modal/execute";

export const executeCodeTool = tool(
  async ({ code }: { code: string }) => {
    const result = await executeCode(code);
    return formatExecutionResult(result);
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
