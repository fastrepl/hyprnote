import {
  AuthRetryableFetchError,
  createClient,
  processLock,
  type Session,
  SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
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

const isLocalAuthServer = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const clearAuthStorage = async (): Promise<void> => {
  try {
    const store = await load("auth.json");
    await store.clear();
    await store.save();
  } catch {
    // Ignore storage errors
  }
};

// Check if we're in an iframe (extension host) context where Tauri APIs are not available
const isIframeContext =
  typeof window !== "undefined" && window.self !== window.top;

// Only create Tauri storage if we're not in an iframe context
const tauriStorage: SupportedStorage | null = isIframeContext
  ? null
  : {
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

// Only create Supabase client if we're not in an iframe context and have valid config
const supabase =
  !isIframeContext &&
  env.VITE_SUPABASE_URL &&
  env.VITE_SUPABASE_ANON_KEY &&
  tauriStorage
    ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
        global: {
          fetch: tauriFetch,
        },
        auth: {
          storage: tauriStorage,
          autoRefreshToken: false,
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
  const [serverReachable, setServerReachable] = useState(true);

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
    } else {
      setServerReachable(true);
      supabase.auth.startAutoRefresh();
    }
  };

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const appWindow = getCurrentWindow();

    const unlistenFocus = appWindow.listen("tauri://focus", () => {
      if (serverReachable) {
        supabase.auth.startAutoRefresh();
      }
    });
    const unlistenBlur = appWindow.listen("tauri://blur", () => {
      supabase.auth.stopAutoRefresh();
    });

    onOpenUrl(([url]) => {
      handleAuthCallback(url);
    });

    return () => {
      unlistenFocus.then((fn) => fn());
      unlistenBlur.then((fn) => fn());
    };
  }, [serverReachable]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          if (
            error instanceof AuthRetryableFetchError &&
            isLocalAuthServer(env.VITE_SUPABASE_URL)
          ) {
            await clearAuthStorage();
            setServerReachable(false);
            setSession(null);
            return;
          }
        }
        if (data.session) {
          setSession(data.session);
          setServerReachable(true);
          supabase.auth.startAutoRefresh();
        }
      } catch (e) {
        if (
          e instanceof AuthRetryableFetchError &&
          isLocalAuthServer(env.VITE_SUPABASE_URL)
        ) {
          await clearAuthStorage();
          setServerReachable(false);
          setSession(null);
        }
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && !session) {
        if (isLocalAuthServer(env.VITE_SUPABASE_URL)) {
          clearAuthStorage();
          setServerReachable(false);
        }
      }
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

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (error instanceof AuthRetryableFetchError) {
          await clearAuthStorage();
          setSession(null);
          return;
        }
        console.error(error);
      }
    } catch (e) {
      if (e instanceof AuthRetryableFetchError) {
        await clearAuthStorage();
        setSession(null);
      }
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
