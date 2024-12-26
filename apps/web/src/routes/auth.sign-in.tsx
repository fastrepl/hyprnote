import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";

export const Route = createFileRoute("/auth/sign-in")({
  component: Component,
});

function Component() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn routing="path" path="/auth/sign-in" signUpUrl="/auth/sign-up" />
    </div>
  );
}
