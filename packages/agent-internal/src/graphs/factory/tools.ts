import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { executeCode, formatExecutionResult } from "../../modal/execute";

export const executeCodeTool = tool(
  async (args: { code: string; isMutating: boolean }) => {
    const result = await executeCode(args.code);
    return formatExecutionResult(result);
  },
  {
    name: "executeCode",
    description:
      "Execute TypeScript/JavaScript code in a sandboxed environment",
    schema: z.object({
      code: z.string().describe("The code to execute"),
      isMutating: z
        .boolean()
        .describe(
          "True if this operation creates, updates, or deletes data. False for read-only operations.",
        ),
    }),
  },
);
