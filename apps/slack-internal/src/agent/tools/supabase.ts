import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { supabaseGraph } from "../graphs/supabase";

export const supabaseTool = tool(
  async ({ request }: { request: string }) => {
    const result = await supabaseGraph.invoke(request);
    return result;
  },
  {
    name: "supabase",
    description:
      "Handle any Supabase-related operation. Describe what you need (e.g., 'list users', 'query orders table', 'delete user by email'). The Supabase specialist will figure out how to accomplish it.",
    schema: z.object({
      request: z
        .string()
        .describe("Natural language description of the Supabase operation"),
    }),
  },
);
