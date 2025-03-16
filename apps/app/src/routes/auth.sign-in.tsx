import { SignedIn, SignedOut, useSignIn } from "@clerk/clerk-react";
import type { OAuthStrategy } from "@clerk/types";
import { createFileRoute, LinkProps, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { createURL } from "../utils";
import { schema as connectSchema } from "./auth.connect";

import { Button } from "@hypr/ui/components/ui/button";
import { Particles } from "@hypr/ui/components/ui/particles";

export const Route = createFileRoute("/auth/sign-in")({
  validateSearch: zodValidator(connectSchema.optional().catch(undefined)),
  component: Component,
});

function Component() {
  const { signIn } = useSignIn();

  if (!signIn) {
    return null;
  }

  const navigate = useNavigate();
  const search = Route.useSearch();

  const redirectUrl = createURL("/auth/sso-callback", search).toString();

  const redirectUrlComplete = search?.c
    ? createURL("/auth/connect", search).toString()
    : ("/" satisfies LinkProps["to"]);

  // https://clerk.com/docs/custom-flows/oauth-connections#create-the-sign-up-and-sign-in-flow
  const signInWith = async (strategy: OAuthStrategy) => {
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl,
        redirectUrlComplete,
      });
    } catch (err) {
      // https://clerk.com/docs/custom-flows/error-handling
      console.error(err);
    }
  };

  return (
    <main className="relative flex h-screen flex-col items-center justify-center overflow-auto p-4">
      <div className="z-10 flex w-full flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <h1 className="mb-4 text-5xl font-bold md:text-6xl lg:text-7xl">
            Welcome
          </h1>

          <SignedOut>
            <p className="mb-12 text-center text-base font-medium text-neutral-600 md:text-lg lg:text-xl">
              Sign in to continue to Hyprnote
            </p>
            <div className="mb-4 w-full">
              <Button
                size="lg"
                variant="outline"
                className="w-full min-h-11 text-lg"
                onClick={() => signInWith("oauth_google")}
              >
                <img src="/google_icon.svg" alt="Google" className="size-5" />
                Sign in with Google
              </Button>
            </div>
            <TOS />
          </SignedOut>
          <SignedIn>
            <div className="mb-4 w-full">
              <Button
                size="lg"
                variant="outline"
                className="w-full min-h-11 text-lg"
                onClick={() => navigate({ to: "/auth/sign-out" })}
              >
                Sign out
              </Button>
            </div>
          </SignedIn>
        </div>
      </div>

      <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        color={"#000000"}
        refresh
      />
    </main>
  );
}

function TOS() {
  return (
    <p className="text-xs text-neutral-400">
      By proceeding, I agree to the{" "}
      <a
        href="https://hyprnote.com/docs/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="decoration-dotted hover:underline"
      >
        Terms of Service
      </a>{" "}
      and{" "}
      <a
        href="https://hyprnote.com/docs/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="decoration-dotted hover:underline"
      >
        Privacy Policy
      </a>
    </p>
  );
}
