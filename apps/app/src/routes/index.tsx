import { createFileRoute } from "@tanstack/react-router";
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
} from "@clerk/clerk-react";
import { clsx } from "clsx";
import { Particles } from "@hypr/ui/components/ui/particles";
import { Button } from "@hypr/ui/components/ui/button";

export const Route = createFileRoute("/")({
  component: Component,
});

function Component() {
  return (
    <main className="relative flex h-screen flex-col items-center justify-center overflow-auto p-4">
      <header
        className={clsx([
          "absolute left-0 right-0 top-0 z-10 min-h-11 px-2",
          "flex w-full items-center justify-between",
          "bg-transparent",
        ])}
      >
        <div /> {/* Empty div for spacing */}
        <SignedIn>
          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </SignedIn>
      </header>

      <div className="z-10 flex w-full flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <h1 className="mb-4 text-6xl font-bold md:text-7xl lg:text-8xl">
            Hyprnote
          </h1>

          <p className="mb-12 text-center text-lg font-medium text-neutral-600 md:text-xl lg:text-2xl">
            AI notepad for meetings
          </p>

          <div className="mb-4 w-full">
            <a href="https://hyprnote.com" className="w-full">
              <Button className="w-full" size="lg">
                Go to homepage
              </Button>
            </a>
          </div>
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
