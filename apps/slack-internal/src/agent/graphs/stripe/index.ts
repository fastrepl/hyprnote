import { createSubgraph } from "../factory";

export const stripeGraph = createSubgraph({
  name: "stripe",
  toolName: "executeStripeCode",
  toolDescription: "Execute TypeScript/JavaScript code to interact with Stripe",
  promptDir: import.meta.dirname,
});
