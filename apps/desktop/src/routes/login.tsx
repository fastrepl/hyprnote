import { Trans, useLingui } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { message } from "@tauri-apps/plugin-dialog";
import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { commands } from "@/types";
import { commands as authCommands, events } from "@hypr/plugin-auth";
import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as sfxCommands } from "@hypr/plugin-sfx";
import { Particles } from "@hypr/ui/components/ui/particles";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";

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
  const navigate = useNavigate();
  const { t } = useLingui();

  const [port, setPort] = useState<number | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let unlisten: (() => void) | undefined;

    authCommands.startOauthServer().then((port) => {
      setPort(port);

      events.authEvent.listen(({ payload }) => {
        if (payload === "success") {
          commands.setupDbForCloud().then(() => {
            navigate({ to: "/onboarding", replace: true });
          });
          return;
        }

        if (payload.error) {
          message("Error occurred while authenticating!");
          return;
        }
      }).then((fn) => {
        unlisten = fn;
      });

      cleanup = () => {
        unlisten?.();
        authCommands.stopOauthServer(port);
      };
    });

    return () => cleanup?.();
  }, []);

  // const url = useQuery({
  //   queryKey: ["oauth-url", port],
  //   enabled: !!port,
  //   queryFn: () => {
  //     const u = new URL(baseUrl);

  //     u.pathname = "/auth/connect";

  //     const params: RequestParams = {
  //       c: code,
  //       f: fingerprint,
  //       p: port!,
  //     };
  //     u.searchParams.set("c", params.c);
  //     u.searchParams.set("f", params.f);
  //     u.searchParams.set("p", params.p.toString());

  //     return u.toString();
  //   },
  // });

  const handleStartLocal = () => {
    navigate({ to: "/onboarding" });
  };

  // const handleStartCloud = () => {
  //   if (url.data) {
  //     open(url.data);
  //   } else {
  //     message("Failed to start authentication process!");
  //   }
  // }

  return (
    <main className="relative flex h-screen flex-col items-center justify-center overflow-auto p-4">
      <header
        className="absolute left-0 right-0 top-0 z-10 min-h-11 px-2 flex w-full items-center justify-between bg-transparent"
        data-tauri-drag-region
      >
        <div />
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
            {t`HYPRNOTE`}
          </TextAnimate>

          <TextAnimate
            animation="slideUp"
            by="word"
            once
            className="mb-16 text-center text-lg font-medium text-neutral-600 md:text-xl lg:text-2xl"
          >
            {t`AI notepad for meetings`}
          </TextAnimate>

          <PushableButton
            disabled={port === null}
            onClick={handleStartLocal}
            className="mb-4 w-full"
          >
            <Trans>Get Started</Trans>
          </PushableButton>
        </div>
      </div>

      {
        /* <Button
        variant="ghost"
        className="mt-8 absolute bottom-2 z-10"
        onClick={handleStartLocal}
      >
        <Trans>Skip to use locally</Trans>
      </Button> */
      }

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
      {isPlaying ? <Pause className="h-4 w-4 text-neutral-600" /> : <Play className="h-4 w-4 text-neutral-600" />}
    </button>
  );
}
