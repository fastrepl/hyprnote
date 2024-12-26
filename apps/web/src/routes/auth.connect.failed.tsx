import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/clerk-react";

export const Route = createFileRoute("/auth/connect/failed")({
  component: Component,
});

function Component() {
  return (
    <>
      <SignedIn>
        <div>Failed to connect!</div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
