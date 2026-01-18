import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { stripeGraph } from "../graphs/stripe";

export const stripeTool = tool(
  async ({ request }: { request: string }) => {
    const result = await stripeGraph.invoke(request);
    return result;
  },
  {
    name: "stripe",
    description:
      "Handle any Stripe-related operation. Describe what you need (e.g., 'look up customer by email', 'list active subscriptions', 'cancel subscription'). The Stripe specialist will figure out how to accomplish it.",
    schema: z.object({
      request: z
        .string()
        .describe("Natural language description of the Stripe operation"),
    }),
  },
);
