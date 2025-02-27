import { zodValidator } from "@tanstack/zod-adapter";
import { createFileRoute, LinkProps } from "@tanstack/react-router";
import { SignedOut, SignIn } from "@clerk/clerk-react";

import { schema as connectSchema } from "./auth.connect";
import { createURL } from "../utils";

export const Route = createFileRoute("/auth/sign-in")({
  validateSearch: zodValidator(connectSchema.optional().catch(undefined)),
  component: Component,
});

function Component() {
  const search = Route.useSearch();

  const forceRedirectUrl = search
    ? createURL("/auth/connect", search).toString()
    : ("/" satisfies LinkProps["to"]);
  const signUpForceRedirectUrl = search
    ? createURL("/auth/connect", search).toString()
    : ("/" satisfies LinkProps["to"]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignedOut>
        <SignIn
          routing="path"
          path="/auth/sign-in"
          signUpUrl="/auth/sign-up"
          forceRedirectUrl={forceRedirectUrl}
          signUpForceRedirectUrl={signUpForceRedirectUrl}
        />
      </SignedOut>
    </div>
  );
}
