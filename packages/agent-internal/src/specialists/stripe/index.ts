import type { AgentGraph } from "../../types";
import { createSpecialist } from "../factory";

export const stripeSpecialist: AgentGraph<string, string> = createSpecialist({
  name: "stripe",
  promptDir: import.meta.dirname,
});
