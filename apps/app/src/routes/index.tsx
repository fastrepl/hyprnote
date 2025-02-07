import { createFileRoute } from "@tanstack/react-router";
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
} from "@clerk/clerk-react";

export const Route = createFileRoute("/")({
  component: Component,
});

function Component() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Hyprnote</h1>
      <div className="flex flex-row gap-2 mt-4">
        <SignedIn>
          <UserButton />
          <a href="hypr://open" className="hover:underline">
            Open Desktop App
          </a>
        </SignedIn>
        <SignedOut>
          <SignInButton />
        </SignedOut>
      </div>
    </div>
  );
}
