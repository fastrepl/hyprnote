import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import { SignedIn, SignedOut, SignIn, UserButton } from "@clerk/clerk-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <SignedOut>
        <SignIn />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </div>
  );
}
