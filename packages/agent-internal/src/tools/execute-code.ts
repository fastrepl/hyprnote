import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { executeCode, formatExecutionResult } from "../modal/execute";

export type ExecuteCodeArgs = z.infer<typeof executeCodeArgsSchema>;

export const executeCodeArgsSchema = z.object({
  code: z.string().describe("The code to execute"),
  isMutating: z
    .boolean()
    .optional()
    .describe(
      "True if this operation creates, updates, or deletes data. False for read-only operations.",
    ),
});

export const executeCodeTool = tool(
  async ({ code }: ExecuteCodeArgs) => {
    const result = await executeCode(code);
    return formatExecutionResult(result);
  },
  {
    name: "executeCode",
    description:
      "Execute TypeScript/JavaScript code in a sandboxed environment",
    schema: executeCodeArgsSchema,
  },
);
