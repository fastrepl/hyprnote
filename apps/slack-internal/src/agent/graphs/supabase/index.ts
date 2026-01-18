import { createSubgraph } from "../factory";

export const supabaseGraph = createSubgraph({
  name: "supabase",
  toolName: "executeSupabaseCode",
  toolDescription:
    "Execute TypeScript/JavaScript code to interact with Supabase",
  promptDir: import.meta.dirname,
});
