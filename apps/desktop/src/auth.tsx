import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  createClient,
  navigatorLock,
  type Session,
  SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";
import { useMutation } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { version as osVersion, platform } from "@tauri-apps/plugin-os";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

const isInvalidSessionError = (error: unknown): boolean => {
  if (error instanceof AuthSessionMissingError) {
    return true;
  }
  if (error instanceof AuthApiError) {
    const invalidCodes = [
      "refresh_token_already_used",
      "refresh_token_not_found",
      "invalid_refresh_token",
    ];
    return invalidCodes.includes(error.code ?? "");
  }
  return false;
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
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          lock: navigatorLock,
        },
      })
    : null;

const AuthContext = createContext<{
  supabase: SupabaseClient | null;
  session: Session | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
  isRefreshingSession: boolean;
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
  const [fingerprint, setFingerprint] = useState<string | null>(null);

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
        void supabase.auth.startAutoRefresh();
      }
    },
    [],
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

  // Note: We don't stop auto-refresh when the app is backgrounded because:
  // 1. Token refresh happens only ~1x/hour (negligible battery/resource impact)
  // 2. Keeping refresh active prevents session expiry after 57+ minutes in background
  // 3. Provides better UX when user returns to app after extended periods
  // 4. Supabase's autoRefreshToken: true handles this automatically

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const clearInvalidSession = async () => {
      void supabase.auth.stopAutoRefresh();
      await clearAuthStorage();
      setSession(null);
    };

    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          if (isInvalidSessionError(error)) {
            await clearInvalidSession();
            return;
          }
          if (
            error instanceof AuthRetryableFetchError &&
            isLocalAuthServer(env.VITE_SUPABASE_URL)
          ) {
            return;
          }
        }

        if (!data.session) {
          return;
        }

        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();

        if (refreshError) {
          if (isInvalidSessionError(refreshError)) {
            await clearInvalidSession();
            return;
          }
          if (
            refreshError instanceof AuthRetryableFetchError &&
            isLocalAuthServer(env.VITE_SUPABASE_URL)
          ) {
            setSession(data.session);
            void supabase.auth.startAutoRefresh();
            return;
          }
          await clearInvalidSession();
          return;
        }

        if (refreshData.session) {
          setSession(refreshData.session);
          void supabase.auth.startAutoRefresh();
        }
      } catch (e) {
        if (isInvalidSessionError(e)) {
          await clearInvalidSession();
          return;
        }
        if (e instanceof AuthRetryableFetchError) {
          return;
        }
        if (isLocalAuthServer(env.VITE_SUPABASE_URL)) {
          await clearInvalidSession();
        }
      }
    };

    void initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && !session) {
        if (isLocalAuthServer(env.VITE_SUPABASE_URL)) {
          void clearAuthStorage();
        }
      }
      if (event === "SIGNED_IN" && session) {
        void analyticsCommands.event({
          event: "user_signed_in",
        });
        void (async () => {
          const appVersion = await getVersion();
          void analyticsCommands.setProperties({
            email: session.user.email,
            user_id: session.user.id,
            set_once: {
              account_created_date: new Date().toISOString(),
            },
            set: {
              is_signed_up: true,
              app_version: appVersion,
              os_version: osVersion(),
              platform: platform(),
            },
          });
        })();
      }
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const refreshSessionMutation = useMutation({
    mutationFn: async (): Promise<Session | null> => {
      if (!supabase) {
        return null;
      }

      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        return null;
      }
      if (data.session) {
        setSession(data.session);
        return data.session;
      }
      return null;
    },
  });

  const refreshSession = useCallback(
    () => refreshSessionMutation.mutateAsync(),
    [refreshSessionMutation.mutateAsync],
  );

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
      isRefreshingSession: refreshSessionMutation.isPending,
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
      refreshSessionMutation.isPending,
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
