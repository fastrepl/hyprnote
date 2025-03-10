import { createFileRoute } from "@tanstack/react-router";
import {
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
} from "@clerk/clerk-react";
import clsx from "clsx";
import { Particles } from "@hypr/ui/components/ui/particles";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import PushableButton from "@hypr/ui/components/ui/pushable-button";

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
          <TextAnimate
            animation="blurIn"
            as="h1"
            once
            className="mb-4 font-racing-sans text-6xl font-bold md:text-7xl lg:text-8xl"
          >
            Hyprnote
          </TextAnimate>

          <TextAnimate
            animation="slideUp"
            by="word"
            once
            className="mb-12 text-center text-lg font-medium text-neutral-600 md:text-xl lg:text-2xl"
          >
            AI notepad for meetings
          </TextAnimate>

          <SignedIn>
            <div className="mb-4 w-full">
              <a href="hypr://open" className="w-full">
                <PushableButton className="w-full">
                  Open Desktop App
                </PushableButton>
              </a>
            </div>
          </SignedIn>
          <SignedOut>
            <div className="mb-4 w-full">
              <SignInButton>
                <PushableButton className="w-full">Sign In</PushableButton>
              </SignInButton>
            </div>
            <TOS />
          </SignedOut>
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

function TOS() {
  return (
    <p className="text-xs text-neutral-400">
      By proceeding, I agree to the{" "}
      <a
        href="https://hyprnote.com/docs/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="decoration-dotted hover:underline"
      >
        Terms of Service
      </a>{" "}
      and{" "}
      <a
        href="https://hyprnote.com/docs/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="decoration-dotted hover:underline"
      >
        Privacy Policy
      </a>
    </p>
  );
}
