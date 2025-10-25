import { createClient, processLock, type Session, SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";
import { load } from "@tauri-apps/plugin-store";
import { createContext, useContext, useEffect, useState } from "react";

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
      lock: processLock,
    },
  })
  : null;

const AuthContext = createContext<
  {
    supabase: SupabaseClient | null;
    session: Session | null;
    apiClient: ReturnType<typeof buildApiClient> | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
  } | null
>(null);

const buildApiClient = (session: Session) => {
  const base = "http://localhost:3000";
  const apiClient = {
    syncWrite: (changes: any) => {
      return fetch(`${base}/v1/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify(changes),
      });
    },
  };

  return apiClient;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [apiClient, setApiClient] = useState<ReturnType<typeof buildApiClient> | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const appWindow = getCurrentWindow();

    appWindow.listen("tauri://focus", () => {
      supabase.auth.startAutoRefresh();
    });
    appWindow.listen("tauri://blur", () => {
      supabase.auth.stopAutoRefresh();
    });

    onOpenUrl(([url]) => {
      const parsed = new URL(url);
      const accessToken = parsed.searchParams.get("access_token");
      const refreshToken = parsed.searchParams.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
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

  useEffect(() => {
    if (!session) {
      setApiClient(null);
    } else {
      setApiClient(buildApiClient(session));
    }
  }, [session]);

  const signIn = async () => {
    await openUrl("http://localhost:3000/auth?flow=desktop");
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
    }
  };

  const value = {
    session,
    supabase,
    apiClient,
    signIn,
    signOut,
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
