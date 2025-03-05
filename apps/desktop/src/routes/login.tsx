import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { open } from "@tauri-apps/plugin-shell";
import { message } from "@tauri-apps/plugin-dialog";
import { Channel } from "@tauri-apps/api/core";

import clsx from "clsx";
import { Trans } from "@lingui/react/macro";
import { Play, Pause } from "lucide-react";

import {
  commands as authCommands,
  type AuthEvent,
  type RequestParams,
} from "@hypr/plugin-auth";
import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { commands as miscCommands } from "@hypr/plugin-misc";

import { commands } from "@/types";
import { baseUrl } from "@/client";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { Particles } from "@hypr/ui/components/ui/particles";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { Button } from "@hypr/ui/components/ui/button";

export const Route = createFileRoute("/login")({
  component: Component,
  loader: async () => {
    const fingerprint = await miscCommands.getFingerprint();
    return {
      code: window.crypto.randomUUID(),
      fingerprint,
    };
  },
});

function Component() {
  const { code, fingerprint } = Route.useLoaderData();
  const navigate = useNavigate();

  const [port, setPort] = useState<number | null>(null);
  const [status, setStatus] = useState<AuthEvent | "Idle">("Idle");

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const channel = new Channel<AuthEvent>();
    channel.onmessage = setStatus;

    authCommands.startOauthServer(channel).then((port) => {
      setPort(port);
      cleanup = () => {
        authCommands.stopOauthServer(port);
      };
    });

    return () => cleanup?.();
  }, []);

  useEffect(() => {
    if (status === "Success") {
      commands.setupDb().then(() => {
        navigate({ to: "/onboarding" });
      });
      return;
    }

    if (status === "Error") {
      message("Error occurred while authenticating!");
      return;
    }
  }, [status]);

  const url = useQuery({
    queryKey: ["oauth-url", port],
    enabled: !!port,
    queryFn: () => {
      const u = new URL(baseUrl);

      u.pathname = "/auth/connect";

      const params: RequestParams = {
        c: code,
        f: fingerprint,
        p: port!,
      };
      u.searchParams.set("c", params.c);
      u.searchParams.set("f", params.f);
      u.searchParams.set("p", params.p.toString());

      return u.toString();
    },
  });

  const handleSignIn = () => {
    if (url.data) {
      open(url.data);
    } else {
      message("Failed to start authentication process!");
    }
  };

  return (
    <main className="relative flex h-screen flex-col items-center justify-center overflow-auto p-4">
      <header
        className={clsx([
          "absolute left-0 right-0 top-0 z-10 min-h-11 px-2",
          "flex w-full items-center justify-between",
          "bg-transparent",
        ])}
        data-tauri-drag-region
      >
        <div /> {/* Empty div for spacing */}
        <PlayPauseButton />
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

          <PushableButton onClick={handleSignIn} className="mb-4 w-full">
            <Trans>Get Started</Trans>
          </PushableButton>

          <TOS />
        </div>
      </div>

      <SkipToUseLocally />

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

function SkipToUseLocally() {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      className="mt-8 absolute bottom-2 z-10"
      onClick={() => {
        navigate({ to: "/onboarding" });
      }}
    >
      <Trans>Skip to use locally</Trans>
    </Button>
  );
}

function PlayPauseButton() {
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (isPlaying) {
      sfxCommands.play("BGM");
    } else {
      sfxCommands.stop("BGM");
    }
  }, [isPlaying]);

  return (
    <button
      className="rounded-full p-2 transition-colors hover:bg-neutral-100"
      onClick={() => setIsPlaying(!isPlaying)}
    >
      {isPlaying ? (
        <Pause className="h-4 w-4 text-neutral-600" />
      ) : (
        <Play className="h-4 w-4 text-neutral-600" />
      )}
    </button>
  );
}
