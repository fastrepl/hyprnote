import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { loopsSpecialist } from "../graphs/loops";

export const loopsTool = tool(
  async ({ request }: { request: string }) => {
    return loopsSpecialist.invoke(request);
  },
  {
    name: "loops",
    description:
      "Handle any Loops.so email marketing operation. Describe what you need (e.g., 'create contact with email user@example.com', 'send signup event to user', 'list mailing lists'). The Loops specialist will figure out how to accomplish it.",
    schema: z.object({
      request: z
        .string()
        .describe("Natural language description of the Loops operation"),
    }),
  },
);
