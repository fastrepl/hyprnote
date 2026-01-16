import {
  AuthRetryableFetchError,
  AuthSessionMissingError,
  createClient,
  processLock,
  type Session,
  SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands } from "@hypr/plugin-auth";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as openerCommands } from "@hypr/plugin-opener2";

import { env } from "./env";
import { getScheme } from "./utils";

export const DEVICE_FINGERPRINT_HEADER = "x-device-fingerprint";

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
    await commands.clear();
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
        const result = await commands.getItem(key);
        if (result.status === "error") {
          return null;
        }
        return result.data;
      },
      async setItem(key: string, value: string): Promise<void> {
        await commands.setItem(key, value);
      },
      async removeItem(key: string): Promise<void> {
        await commands.removeItem(key);
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
          lockAcquireTimeout: 30000,
        },
      })
    : null;

const AuthContext = createContext<{
  supabase: SupabaseClient | null;
  session: Session | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
  handleAuthCallback: (url: string) => Promise<void>;
  setSessionFromTokens: (
    accessToken: string,
    refreshToken: string,
  ) => Promise<void>;
  getHeaders: () => Record<string, string> | null;
  getAvatarUrl: () => Promise<string>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [serverReachable, setServerReachable] = useState(true);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const autoRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isRefreshingRef = useRef(false);

  const debouncedStartAutoRefresh = useCallback(() => {
    if (!supabase) return;
    if (autoRefreshTimeoutRef.current) {
      clearTimeout(autoRefreshTimeoutRef.current);
    }
    autoRefreshTimeoutRef.current = setTimeout(() => {
      void supabase.auth.startAutoRefresh();
    }, 100);
  }, []);

  useEffect(() => {
    if (isIframeContext) return;
    miscCommands.getFingerprint().then((result) => {
      if (result.status === "ok") {
        setFingerprint(result.data);
      }
    });
  }, []);

  const setSessionFromTokens = useCallback(
    async (accessToken: string, refreshToken: string) => {
      if (!supabase) {
        console.error("Supabase client not found");
        return;
      }

      const res = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (res.error) {
        console.error(res.error);
      } else {
        setSession(res.data.session);
        setServerReachable(true);
        debouncedStartAutoRefresh();
      }
    },
    [debouncedStartAutoRefresh],
  );

  const handleAuthCallback = useCallback(
    async (url: string) => {
      const parsed = new URL(url);
      const accessToken = parsed.searchParams.get("access_token");
      const refreshToken = parsed.searchParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        console.error("invalid_callback_url");
        return;
      }

      await setSessionFromTokens(accessToken, refreshToken);
    },
    [setSessionFromTokens],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const appWindow = getCurrentWindow();

    const unlistenFocus = appWindow.listen("tauri://focus", () => {
      if (serverReachable && isInitialized) {
        debouncedStartAutoRefresh();
      }
    });
    const unlistenBlur = appWindow.listen("tauri://blur", () => {
      void supabase.auth.stopAutoRefresh();
    });

    void onOpenUrl(([url]) => {
      void handleAuthCallback(url);
    });

    return () => {
      void unlistenFocus.then((fn) => fn());
      void unlistenBlur.then((fn) => fn());
    };
  }, [
    serverReachable,
    isInitialized,
    debouncedStartAutoRefresh,
    handleAuthCallback,
  ]);

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
            setServerReachable(false);
            return;
          }
        }
        if (data.session) {
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();
          if (refreshError) {
            if (refreshError instanceof AuthSessionMissingError) {
              await clearAuthStorage();
              setSession(null);
              return;
            }
            if (
              refreshError instanceof AuthRetryableFetchError &&
              isLocalAuthServer(env.VITE_SUPABASE_URL)
            ) {
              setServerReachable(false);
              setSession(data.session);
              debouncedStartAutoRefresh();
              return;
            }
          }
          if (refreshData.session) {
            setSession(refreshData.session);
            setServerReachable(true);
            debouncedStartAutoRefresh();
          }
        }
      } catch (e) {
        if (e instanceof AuthSessionMissingError) {
          await clearAuthStorage();
          setSession(null);
          return;
        }
        if (
          e instanceof AuthRetryableFetchError &&
          isLocalAuthServer(env.VITE_SUPABASE_URL)
        ) {
          setServerReachable(false);
        }
      } finally {
        setIsInitialized(true);
      }
    };

    let subscription: { unsubscribe: () => void } | null = null;

    const setup = async () => {
      await initSession();

      const result = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "TOKEN_REFRESHED" && !session) {
          if (isLocalAuthServer(env.VITE_SUPABASE_URL)) {
            void clearAuthStorage();
            setServerReachable(false);
          }
        }
        if (event === "SIGNED_IN" && session) {
          void analyticsCommands.event({
            event: "user_signed_in",
          });
        }
        setSession(session);
      });
      subscription = result.data.subscription;
    };

    void setup();

    return () => {
      subscription?.unsubscribe();
    };
  }, [debouncedStartAutoRefresh]);

  const signIn = useCallback(async () => {
    const base = env.VITE_APP_URL ?? "http://localhost:3000";
    const scheme = await getScheme();
    await openerCommands.openUrl(
      `${base}/auth?flow=desktop&scheme=${scheme}`,
      null,
    );
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (
          error instanceof AuthRetryableFetchError ||
          error instanceof AuthSessionMissingError
        ) {
          await clearAuthStorage();
          setSession(null);
          return;
        }
        console.error(error);
      }
    } catch (e) {
      if (
        e instanceof AuthRetryableFetchError ||
        e instanceof AuthSessionMissingError
      ) {
        await clearAuthStorage();
        setSession(null);
      }
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<Session | null> => {
    if (!supabase || isRefreshingRef.current) {
      return null;
    }

    isRefreshingRef.current = true;
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        return null;
      }
      if (data.session) {
        setSession(data.session);
        return data.session;
      }
      return null;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const getHeaders = useCallback(() => {
    if (!session) {
      return null;
    }

    const headers: Record<string, string> = {
      Authorization: `${session.token_type} ${session.access_token}`,
    };

    if (fingerprint) {
      headers[DEVICE_FINGERPRINT_HEADER] = fingerprint;
    }

    return headers;
  }, [session, fingerprint]);

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

  const value = useMemo(
    () => ({
      session,
      supabase,
      signIn,
      signOut,
      refreshSession,
      handleAuthCallback,
      setSessionFromTokens,
      getHeaders,
      getAvatarUrl,
    }),
    [
      session,
      signIn,
      signOut,
      refreshSession,
      handleAuthCallback,
      setSessionFromTokens,
      getHeaders,
      getAvatarUrl,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("'useAuth' must be used within an 'AuthProvider'");
  }

  return context;
}
