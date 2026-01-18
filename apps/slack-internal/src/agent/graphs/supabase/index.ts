import { createSpecialist } from "../factory";

export const supabaseSpecialist = createSpecialist({
  name: "supabase",
  promptDir: import.meta.dirname,
});
