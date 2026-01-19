import type { AgentGraph } from "../../types";
import { createSpecialist } from "../factory";
import { fetchDatabaseSchema } from "./schema";

export const supabaseSpecialist: AgentGraph<string, string> = createSpecialist({
  name: "supabase",
  promptDir: import.meta.dirname,
  getContext: async () => ({ schema: await fetchDatabaseSchema() }),
});
