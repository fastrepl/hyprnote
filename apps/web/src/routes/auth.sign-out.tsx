import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignOutButton } from "@clerk/clerk-react";

export const Route = createFileRoute("/auth/sign-out")({
  component: Component,
});

function Component() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignedIn>
        <SignOutButton redirectUrl="/auth/sign-in" />
      </SignedIn>
    </div>
  );
}
