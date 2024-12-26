import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

export const Route = createFileRoute("/auth/connect/success")({
  component: Component,
});

function Component() {
  return (
    <>
      <SignedIn>
        <div>Successfully connected!</div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
