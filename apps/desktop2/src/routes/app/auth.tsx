import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";

import { useAuth } from "../../auth";

export const Route = createFileRoute("/app/auth")({
  component: Component,
});

function Component() {
  const auth = useAuth();

  const hh = useCallback(async () => {
    if (auth?.supabase) {
      const { error } = await auth.supabase.auth.signUp({
        email: "yujonglee.dev@email.com",
        password: "example-password",
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      console.error(error);
    }
  }, [auth?.supabase]);

  return (
    <div>
      <pre>session: {JSON.stringify(auth?.session, null, 2)}</pre>
      <button
        onClick={hh}
      >
        signup
      </button>
    </div>
  );
}
