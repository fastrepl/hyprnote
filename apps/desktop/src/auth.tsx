import {
  createClient,
  processLock,
  type Session,
  SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";
import { load } from "@tauri-apps/plugin-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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

const supabase =
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY
    ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          storage: tauriStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          lock: processLock,
        },
      })
    : null;

const AuthContext = createContext<{
  supabase: SupabaseClient | null;
  session: Session | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  handleAuthCallback: (url: string) => Promise<void>;
  getHeaders: () => Record<string, string> | null;
  getAvatarUrl: () => Promise<string>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const handleAuthCallback = async (url: string) => {
    if (!supabase) {
      console.error("Supabase client not found");
      return;
    }

    const parsed = new URL(url);
    const accessToken = parsed.searchParams.get("access_token");
    const refreshToken = parsed.searchParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      console.error("invalid_callback_url");
      return;
    }

    const res = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (res.error) {
      console.error(res.error);
    }
  };

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
      handleAuthCallback(url);
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

  const signIn = async () => {
    const base = env.VITE_APP_URL ?? "http://localhost:3000";
    await openUrl(`${base}/auth?flow=desktop`);
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

  const getHeaders = useCallback(() => {
    if (!session) {
      return null;
    }

    return { Authorization: `${session.token_type} ${session.access_token}` };
  }, [session]);

  const getAvatarUrl = useCallback(async () => {
    const email = session?.user.email;

    if (!email) {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' fill='%23666'%3E%3F%3C/text%3E%3C/svg%3E";
    }

    const address = email.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(address);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    return `https://gravatar.com/avatar/${hash}`;
  }, [session]);

  const value = {
    session,
    supabase,
    signIn,
    signOut,
    handleAuthCallback,
    getHeaders,
    getAvatarUrl,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("'useAuth' must be used within an 'AuthProvider'");
  }

  return context;
}
