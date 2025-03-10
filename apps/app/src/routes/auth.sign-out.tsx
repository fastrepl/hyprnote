import { createFileRoute } from "@tanstack/react-router";
import { SignedIn, SignOutButton } from "@clerk/clerk-react";
import { clsx } from "clsx";
import { Particles } from "@hypr/ui/components/ui/particles";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { Button } from "@hypr/ui/components/ui/button";

export const Route = createFileRoute("/auth/sign-out")({
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
      </header>

      <div className="z-10 flex w-full flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <TextAnimate
            animation="blurIn"
            as="h1"
            once
            className="mb-4 font-racing-sans text-5xl font-bold md:text-6xl lg:text-7xl"
          >
            Sign Out
          </TextAnimate>

          <TextAnimate
            animation="slideUp"
            by="word"
            once
            className="mb-12 text-center text-base font-medium text-neutral-600 md:text-lg lg:text-xl"
          >
            Are you sure you want to sign out?
          </TextAnimate>

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
