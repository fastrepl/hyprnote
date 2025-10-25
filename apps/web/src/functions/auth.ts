import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { env } from "../env";
import { getSupabaseServerClient } from "../utils/supabase";

export const doAuth = createServerFn({ method: "POST" })
  .inputValidator(z.discriminatedUnion(
    "method",
    [
      z.object({
        method: z.literal("email_otp"),
        email: z.email(),
        redirectTo: z.string().optional(),
      }),
      z.object({
        method: z.literal("oauth"),
        provider: z.enum(["google", "github"]),
        redirectTo: z.string().optional(),
      }),
    ],
  ))
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    if (data.method === "email_otp") {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: data.redirectTo || `${env.VITE_APP_URL}/callback/auth`,
        },
      });

      if (error) {
        return { error: true, message: error.message };
      }

      return { success: true, message: "Check your email for the login link" };
    }

    if (data.method === "oauth") {
      const { data: authData, error } = await supabase.auth.signInWithOAuth({
        provider: data.provider,
        options: {
          // Use custom redirect if provided (desktop flow), otherwise default to web callback
          redirectTo: data.redirectTo || `${process.env.VITE_APP_URL}/callback/auth`,
        },
      });

      if (error) {
        return { error: true, message: error.message };
      }

      // Return the OAuth URL for client-side redirect
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

export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: true, message: error.message };
  }

  return { success: true };
});
