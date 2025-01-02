import { z } from "zod";
import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMutation } from "@tanstack/react-query";
import { SignedIn, RedirectToSignIn, useAuth } from "@clerk/clerk-react";

const schema = z.object({
  code: z.string().optional(),
});

export const Route = createFileRoute("/auth/connect/")({
  validateSearch: zodValidator(schema),
  component: Component,
});

function Component() {
  const navigate = useNavigate();
  const { code } = Route.useSearch();
  const { isLoaded, userId } = useAuth();

  const mutation = useMutation({
    mutationFn: async (args: { code: string }) => {
      const response = await fetch("/api/web/connect", {
        method: "POST",
        body: JSON.stringify(args),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      return data;
    },
  });

  useEffect(() => {
    if (mutation.status === "success") {
      navigate({ to: "/auth/connect/success" });
    }
    if (mutation.status === "error") {
      navigate({ to: "/auth/connect/failed" });
    }
  }, [mutation.status]);

  if (!isLoaded) {
    return <div>...</div>;
  }

  if (!userId) {
    return <RedirectToSignIn />;
  }

  if (!code) {
    return (
      <div>
        <p>No code provided</p>
        <Link href="https://hyprnote.com">Go to Hyprnote</Link>
      </div>
    );
  }

  return (
    <SignedIn>
      <div>
        <button
          disabled={mutation.status !== "idle"}
          onClick={() => mutation.mutate({ code })}
        >
          Connect
        </button>
      </div>
    </SignedIn>
  );
}
