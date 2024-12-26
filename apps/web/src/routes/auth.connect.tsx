import { z } from "zod";
import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMutation } from "@tanstack/react-query";
import { SignedIn, RedirectToSignIn, useAuth } from "@clerk/clerk-react";

const schema = z.object({
  code: z.string().optional(),
});

export const Route = createFileRoute("/auth/connect")({
  validateSearch: zodValidator(schema),
  component: Component,
});

function Component() {
  const navigate = useNavigate();
  const { code } = Route.useSearch();
  const { isLoaded, userId } = useAuth();

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

  const mutation = useMutation({
    mutationFn: (args: any) => {
      return args as any;
    },
  });

  useEffect(() => {
    if (mutation.isSuccess) {
      navigate({ to: "/auth/connect/success" });
    }
  }, [mutation.isSuccess]);

  return (
    <SignedIn>
      <div>
        <button
          disabled={mutation.status !== "idle"}
          onClick={() => mutation.mutate({})}
        >
          Connect
        </button>
      </div>
    </SignedIn>
  );
}
