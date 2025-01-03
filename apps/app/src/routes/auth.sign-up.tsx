import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@clerk/clerk-react";

export const Route = createFileRoute("/auth/sign-up")({
  component: Component,
});

function Component() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp routing="path" path="/auth/sign-up" signInUrl="/auth/sign-in" />
    </div>
  );
}
