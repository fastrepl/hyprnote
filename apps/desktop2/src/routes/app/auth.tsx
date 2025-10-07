import { createFileRoute } from "@tanstack/react-router";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { clsx } from "clsx";
import { useCallback, useEffect } from "react";

import { Provider } from "@supabase/supabase-js";
import { useAuth } from "../../auth";

export const Route = createFileRoute("/app/auth")({
  component: Component,
});

function Component() {
  const auth = useAuth();

  const handleCode = async (code: string) => {
    const client = auth?.supabase?.auth;
    if (!client) {
      return;
    }

    const { data, error } = await client.exchangeCodeForSession(code);
    if (error || !data.session) {
      console.error(error);
      return;
    }

    await client.setSession(data.session);
  };

  useEffect(() => {
    onOpenUrl(([url]) => {
      const parsed = new URL(url);
      const code = parsed.searchParams.get("code");
      if (code) {
        handleCode(code);
      }
    });
  }, [handleCode]);

  const handleSignupEmail = useCallback(async (email: string, password: string) => {
    if (auth?.supabase) {
      const redirectUrl = "hypr://auth/callback";

      const { error } = await auth.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
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
      const redirectUrl = "hypr://auth/callback";
      const { error } = await auth.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });
      console.error(error);
    }
  }, [auth?.supabase]);

  return (
    <div className="flex flex-col h-full">
      <Header />
      <pre>session: {JSON.stringify(auth?.session, null, 2)}</pre>
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

      <ManualCodeProvider handleCode={handleCode} />
    </div>
  );
}

function ManualCodeProvider({ handleCode }: { handleCode: (code: string) => void }) {
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const code = formData.get("code") as string;
    handleCode(code);
  }, [handleCode]);

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(["flex flex-col gap-2", "border border-gray-300 rounded-md p-4 m-2"])}
    >
      <input className="border border-gray-300 rounded-md p-2" name="code" />
      <button className="bg-blue-500 text-white px-4 py-2 rounded-md" type="submit">Submit</button>
    </form>
  );
}

function Header() {
  return (
    <header
      data-tauri-drag-region
      className={clsx([
        "flex w-full items-center justify-center min-h-11 py-1 px-2 border-b",
        "border-border bg-neutral-50",
      ])}
    >
      <h1 className="text-md font-semibold" data-tauri-drag-region>
        Hyprnote Auth
      </h1>
    </header>
  );
}
