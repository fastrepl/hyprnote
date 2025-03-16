import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { createFileRoute, type LinkProps } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { createURL } from "../utils";
import { schema as connectSchema } from "./auth.connect";

export const Route = createFileRoute("/auth/sso-callback")({
  validateSearch: zodValidator(connectSchema.optional().catch(undefined)),
  component: Component,
});

function Component() {
  const search = Route.useSearch();

  const redirectUrl = search?.c
    ? createURL("/auth/connect", search).toString()
    : ("/" satisfies LinkProps["to"]);

  return (
    <AuthenticateWithRedirectCallback
      signInForceRedirectUrl={redirectUrl}
      signUpForceRedirectUrl={redirectUrl}
    />
  );
}
