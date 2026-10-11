import type { Session, SupabaseClient } from "@supabase/supabase-js";

import { readPersistedAuthSession } from "./client";

export async function loadInitialSession(
  client: SupabaseClient,
  onRefreshError?: (error: unknown, storedSession: Session | null) => void,
): Promise<Session | null> {
  const storedSession = await readPersistedAuthSession();

  try {
    const { data, error } = await client.auth.getSession();

    if (error) {
      onRefreshError?.(error, storedSession);
      return storedSession;
    }

    return data.session ?? storedSession;
  } catch (error) {
    onRefreshError?.(error, storedSession);
    return storedSession;
  }
}
