import { Provider } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";
import { clsx } from "clsx";
import { useCallback, useEffect } from "react";

import { useAuth } from "../../auth";

export const Route = createFileRoute("/app/auth")({
  component: Component,
});

const redirectTo = import.meta.env.DEV
  ? "http://localhost:3000/callback/auth"
  : "https://web.hyprnote.com/callback/auth";

function Component() {
  const auth = useAuth();

  const handleSession = async (accessToken: string, refreshToken: string) => {
    const client = auth?.supabase?.auth;
    if (!client) {
      return;
    }

    const { error } = await client.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    onOpenUrl(([url]) => {
      const parsed = new URL(url);
      const accessToken = parsed.searchParams.get("access_token");
      const refreshToken = parsed.searchParams.get("refresh_token");
      if (accessToken && refreshToken) {
        handleSession(accessToken, refreshToken);
      }
    });
  }, [handleSession]);

  const handleSignupEmail = useCallback(async (email: string, password: string) => {
    if (auth?.supabase) {
      const { error } = await auth.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      console.error(error);
    }
  }, [auth?.supabase]);

  const handleSignupOAuth = useCallback(async ({
    provider,
  }: {
    provider: Provider;
  }) => {
    if (auth?.supabase) {
      const { data, error } = await auth.supabase.auth.signInWithOAuth({
        provider,
        options: {
          skipBrowserRedirect: true,
          redirectTo,
        },
      });

      if (!error && data.url) {
        openUrl(data.url);
      } else {
        console.error(error);
      }
    }
  }, [auth?.supabase]);

  const handleSignout = useCallback(async () => {
    if (auth?.supabase) {
      const { error } = await auth.supabase.auth.signOut();
      if (error) {
        console.error(error);
      }
    }
  }, [auth?.supabase]);

  return (
    <div className="flex flex-col h-full">
      <Header />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
        onClick={() => handleSignupEmail("yujonglee.dev@gmail.com", "fastreplwillwin1!")}
      >
        signup
      </button>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
        onClick={() => handleSignupOAuth({ provider: "github" })}
      >
        signup with github
      </button>

      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
        onClick={() => handleSignout()}
      >
        signout
      </button>

      <ManualTokenProvider handleSession={handleSession} />

      <pre>session: {JSON.stringify(auth?.session, null, 2)}</pre>
    </div>
  );
}

function ManualTokenProvider(
  { handleSession }: { handleSession: (accessToken: string, refreshToken: string) => void },
) {
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const accessToken = formData.get("access_token") as string;
    const refreshToken = formData.get("refresh_token") as string;
    handleSession(accessToken, refreshToken);
  }, [handleSession]);

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(["flex flex-col gap-2", "border border-neutral-300 rounded-md p-4 m-2"])}
    >
      <input name="access_token" placeholder="Access Token" className="border border-neutral-300 rounded-md p-2" />
      <input name="refresh_token" placeholder="Refresh Token" className="border border-neutral-300 rounded-md p-2" />
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
      >
        Submit
      </button>
    </form>
  );
}

function Header() {
  return (
    <header
      data-tauri-drag-region
      className={clsx([
        "flex w-full items-center justify-center min-h-8 py-1 px-2 border-b",
        "border-border bg-neutral-50",
      ])}
    >
      <h1 className="text-md font-semibold" data-tauri-drag-region>
        Hyprnote Auth
      </h1>
    </header>
  );
}
