import { createClient, processLock, type Session, SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createContext, useContext, useEffect, useState } from "react";

import { load } from "@tauri-apps/plugin-store";

import { env } from "./env";

const tauriStorage: SupportedStorage = {
  async getItem(key: string): Promise<string | null> {
    const store = await load("auth.json");
    const val = await store.get<string>(key);
    return val ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const store = await load("auth.json");
    await store.set(key, value);
    await store.save();
  },
  async removeItem(key: string): Promise<void> {
    const store = await load("auth.json");
    await store.delete(key);
    await store.save();
  },
};

const supabase = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY
  ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      storage: tauriStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lock: processLock,
    },
  })
  : null;

const AuthContext = createContext<
  {
    supabase: SupabaseClient | null;
    session: Session | null;
  } | null
>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const appWindow = getCurrentWindow();

    // TODO
    appWindow.listen("tauri://focus", () => {
      supabase.auth.startAutoRefresh();
    });
    appWindow.listen("tauri://blur", () => {
      supabase.auth.stopAutoRefresh();
    });
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    supabase,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("'useAuth' must be used within an 'AuthProvider'");
  }

  return context;
}
