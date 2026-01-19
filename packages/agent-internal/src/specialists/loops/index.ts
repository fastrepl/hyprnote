import type { AgentGraph } from "../../types";
import { createSpecialist } from "../factory";

export const loopsSpecialist: AgentGraph<string, string> = createSpecialist({
  name: "loops",
  promptDir: import.meta.dirname,
});
