import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import { z } from "zod";

import { getRequestAppOrigin } from "@/functions/app-origin";
import {
  completeIdentityLink,
  identityLinkAccountError,
  identityLinkError,
} from "@/functions/identity-link";
import {
  oauthProviderQueryParams,
  oauthProviderScopes,
} from "@/functions/oauth-provider";
import {
  getSupabaseDesktopFlowClient,
  getSupabaseServerClient,
} from "@/functions/supabase";

const cookieName = "anarlog-identity-link";
const providerSchema = z.enum(["google", "apple", "azure", "github"]);
const pendingSchema = z.object({
  userId: z.uuid(),
  provider: providerSchema,
  state: z.uuid(),
  createdAt: z.number(),
});

export const fetchAccountIdentities = createServerFn({ method: "GET" })
  .inputValidator(z.object({ expectedUserId: z.uuid() }))
  .handler(async ({ data }) => {
    const {
      data: { user },
    } = await getSupabaseServerClient().auth.getUser();
    return {
      error: identityLinkAccountError(user, data.expectedUserId),
      email: user?.email,
      identities: (user?.identities ?? []).map((identity) => ({
        id: identity.id,
        provider: identity.provider,
        email:
          typeof identity.identity_data?.email === "string"
            ? identity.identity_data.email
            : null,
      })),
    };
  });

export const connectAccountIdentity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ expectedUserId: z.uuid(), provider: providerSchema }),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const accountError = identityLinkAccountError(user, data.expectedUserId);
    if (accountError) return { error: accountError };
    if (
      user?.identities?.some((identity) => identity.provider === data.provider)
    ) {
      return { error: "already_connected" as const };
    }

    const state = crypto.randomUUID();
    const callback = new URL("/callback/auth", getRequestAppOrigin());
    callback.search = new URLSearchParams({
      intent: "link_identity",
      link_state: state,
      account_user_id: data.expectedUserId,
    }).toString();
    const result = await supabase.auth.linkIdentity({
      provider: data.provider,
      options: {
        redirectTo: callback.toString(),
        skipBrowserRedirect: true,
        queryParams: oauthProviderQueryParams(data.provider),
        scopes: oauthProviderScopes(data.provider),
      },
    });
    if (result.error || !result.data.url)
      return { error: identityLinkError(result.error?.code) };

    setCookie(
      cookieName,
      JSON.stringify({
        userId: data.expectedUserId,
        provider: data.provider,
        state,
        createdAt: Date.now(),
      }),
      {
        httpOnly: true,
        secure: getRequestAppOrigin().startsWith("https://"),
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      },
    );
    return { url: result.data.url };
  });

export const finishAccountIdentity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      state: z.string().optional(),
      code: z.string().optional(),
      error: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    let pending = null;
    try {
      pending = pendingSchema.parse(
        JSON.parse(getCookie(cookieName) ?? "null"),
      );
    } catch {
      /* Missing or expired requests must never exchange a code. */
    }

    const supabase = getSupabaseServerClient();
    try {
      const status = await completeIdentityLink({
        ...data,
        pending,
        now: Date.now(),
        getUser: async () => (await supabase.auth.getUser()).data.user,
        exchange: async (code) => {
          // Check the returned account before allowing the exchange to replace browser cookies.
          const result =
            await getSupabaseDesktopFlowClient().auth.exchangeCodeForSession(
              code,
            );
          return {
            session: result.data.session,
            errorCode: result.error?.code,
          };
        },
        saveSession: async (session) =>
          !(await supabase.auth.setSession(session)).error,
      });
      return { status, userId: pending?.userId };
    } catch {
      return { status: "failed" as const, userId: pending?.userId };
    } finally {
      if (pending?.state === data.state)
        deleteCookie(cookieName, { path: "/" });
    }
  });
