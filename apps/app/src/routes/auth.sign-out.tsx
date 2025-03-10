import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignOutButton } from "@clerk/clerk-react";
import { clsx } from "clsx";
import { Particles } from "@hypr/ui/components/ui/particles";
import { Button } from "@hypr/ui/components/ui/button";

export const Route = createFileRoute("/auth/sign-out")({
  component: Component,
});

function Component() {
  return (
    <main className="relative flex h-screen flex-col items-center justify-center overflow-auto p-4">
      <div className="z-10 flex w-full flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <h1 className="mb-4 text-5xl font-bold md:text-6xl lg:text-7xl">
            Sign Out
          </h1>

          <p className="mb-12 text-center text-base font-medium text-neutral-600 md:text-lg lg:text-xl">
            Are you sure you want to sign out?
          </p>

          <SignedIn>
            <div className="mb-4 w-full">
              <SignOutButton redirectUrl="/auth/sign-in">
                <Button variant="destructive" size="lg" className="w-full">
                  Sign Out
                </Button>
              </SignOutButton>
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
