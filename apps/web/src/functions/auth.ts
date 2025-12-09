import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { env } from "@/env";
import { getSupabaseServerClient } from "@/functions/supabase";

const shared = z.object({
  flow: z.enum(["desktop", "web"]).default("desktop"),
  scheme: z.string().optional(),
  redirect: z.string().optional(),
});

export const doAuth = createServerFn({ method: "POST" })
  .inputValidator(
    z.discriminatedUnion("method", [
      shared.extend({ method: z.literal("email_otp"), email: z.email() }),
      shared.extend({
        method: z.literal("oauth"),
        provider: z.enum(["google", "github"]),
      }),
    ]),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    if (data.method === "email_otp") {
      const params = new URLSearchParams({ flow: data.flow });
      if (data.scheme) params.set("scheme", data.scheme);
      if (data.redirect) params.set("redirect", data.redirect);

      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${env.VITE_APP_URL}/callback/auth?${params.toString()}`,
        },
      });

      if (error) {
        return { error: true, message: error.message };
      }

      return { success: true, message: "Check your email for the login link" };
    }

    if (data.method === "oauth") {
      const params = new URLSearchParams({ flow: data.flow });
      if (data.scheme) params.set("scheme", data.scheme);
      if (data.redirect) params.set("redirect", data.redirect);

      const { data: authData, error } = await supabase.auth.signInWithOAuth({
        provider: data.provider,
        options: {
          redirectTo: `${env.VITE_APP_URL}/callback/auth?${params.toString()}`,
        },
      });

      if (error) {
        return { error: true, message: error.message };
      }

      return { success: true, url: authData.url };
    }
  });

export const fetchUser = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { data, error: _error } = await supabase.auth.getUser();

  if (!data.user?.email) {
    return null;
  }

  return {
    email: data.user.email,
  };
});

export const signOutFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  },
);
