import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClientOnlyFn, createServerOnlyFn } from "@tanstack/react-start";
import { getCookies, setCookie } from "@tanstack/react-start/server";

import { env } from "@/env";

export const getSupabaseBrowserClient = createClientOnlyFn(() => {
  return createBrowserClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    },
  );
});

export const getSupabaseServerClient = createServerOnlyFn(() => {
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookies) {
        cookies.forEach((cookie) => {
          setCookie(cookie.name, cookie.value);
        });
      },
    },
  });
});
