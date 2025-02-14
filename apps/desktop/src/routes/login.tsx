import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-shell";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { message } from "@tauri-apps/plugin-dialog";
import { commands } from "@/types";
import { baseUrl } from "@/client";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { Particles } from "@hypr/ui/components/ui/particles";
import clsx from "clsx";

export const Route = createFileRoute("/login")({
  component: Component,
  loader: async () => {
    // TODO
    // const fingerprint = await commands.getFingerprint();
    return {
      code: window.crypto.randomUUID(),
      fingerprint: "",
    };
  },
});

function Component() {
  const { code } = Route.useLoaderData();
  const [port, setPort] = useState<number | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    commands.startOauthServer().then((port) => {
      setPort(port);
      cleanup = () => {
        commands.cancelOauthServer(port);
      };
    });

    return () => cleanup?.();
  }, []);

  const url = useQuery({
    queryKey: ["oauth-url", port],
    enabled: !!port,
    queryFn: () => {
      const u = new URL(baseUrl);
      u.pathname = "/auth/connect";
      u.searchParams.set("c", code);
      u.searchParams.set("f", "fingerprint");
      u.searchParams.set("p", port!.toString());
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
          "absolute left-0 right-0 top-0 z-10",
          "flex w-full items-center justify-between",
          "bg-transparent",
          "min-h-11",
        ])}
        data-tauri-drag-region
      />

      <div className="z-10 flex w-full flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <h1 className="mb-4 font-racing-sans text-6xl font-bold md:text-7xl lg:text-8xl">
            Hyprnote
          </h1>

          <p className="mb-12 text-center text-lg font-medium text-neutral-600 md:text-xl lg:text-2xl">
            AI Meeting Notepad that keeps you in flow
          </p>

          <PushableButton onClick={handleSignIn} className="mb-4 w-full">
            <Trans>Get Started</Trans>
          </PushableButton>

          <p className="text-xs text-neutral-400">
            By signing in, I agree to the{" "}
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
