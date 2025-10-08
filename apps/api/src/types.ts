import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type Variables = {
  supabase: SupabaseClient;
  user: User;
  db: PostgresJsDatabase;
};

export type Env = {
  Variables: Variables;
};
