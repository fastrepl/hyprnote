import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { executeCode } from "../../../modal/execute";
import type { ToolSchema } from "../../prompt";

export function createExecuteCodeTool(schema: ToolSchema) {
  return tool(
    async (
      args: { code: string; isMutating: boolean },
      config?: RunnableConfig,
    ) => {
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
      const result = await executeCode(args.code, threadId);
      return JSON.stringify(result);
    },
    {
      name: schema.name,
      description: schema.description,
      schema: z.object({
        code: z
          .string()
          .describe(schema.parameters.code?.description ?? "The code"),
        isMutating: z
          .boolean()
          .describe(schema.parameters.isMutating?.description ?? "Is mutating"),
      }),
    },
  );
}
