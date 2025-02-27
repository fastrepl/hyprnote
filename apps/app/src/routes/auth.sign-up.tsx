import { zodValidator } from "@tanstack/zod-adapter";
import { createFileRoute, type LinkProps } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";

import { schema as connectSchema } from "./auth.connect";
import { createURL } from "../utils";

export const Route = createFileRoute("/auth/sign-up")({
  validateSearch: zodValidator(connectSchema.optional().catch(undefined)),
  component: Component,
});

function Component() {
  const search = Route.useSearch();

  const forceRedirectUrl = search
    ? createURL("/auth/connect", search).toString()
    : ("/" satisfies LinkProps["to"]);
  const signInForceRedirectUrl = search
    ? createURL("/auth/connect", search).toString()
    : ("/" satisfies LinkProps["to"]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp
        routing="path"
        path="/auth/sign-up"
        signInUrl="/auth/sign-in"
        forceRedirectUrl={forceRedirectUrl}
        signInForceRedirectUrl={signInForceRedirectUrl}
      />
    </div>
  );
}
