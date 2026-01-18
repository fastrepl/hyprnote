import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { executeCode } from "../../../modal/execute";
import type { ToolSchema } from "../../prompt";

export function createExecuteCodeTool(schema: ToolSchema) {
  return tool(
    async (args: { code: string; isMutating: boolean }) => {
      const result = await executeCode(args.code);
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
