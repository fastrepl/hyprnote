import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import { SignIn, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="p-2">
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
      <SignedOut>
        <SignIn />
      </SignedOut>
    </div>
  );
}
