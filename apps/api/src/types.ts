import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Variables = {
  supabase: SupabaseClient;
  user: User;
};

export type Env = {
  Variables: Variables;
};
