import type { AgentGraph } from "../../types";
import { createSpecialist } from "../factory";

export const posthogSpecialist: AgentGraph<string, string> = createSpecialist({
  name: "posthog",
  promptDir: import.meta.dirname,
});
