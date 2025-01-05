import { createFileRoute, redirect } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-shell";
import { Trans } from "@lingui/react/macro";

import { commands } from "../types/tauri.ts";

// import { AudioControls } from "../components/AudioControls";

import BlurFade from "@hypr/ui/components/ui/blur-fade";
import RetroGrid from "@hypr/ui/components/ui/retro-grid";
import SparklesText from "@hypr/ui/components/ui/sparkles-text";
import ShimmerButton from "@hypr/ui/components/ui/shimmer-button";
import { Button } from "@hypr/ui/components/ui/button";

export const Route = createFileRoute("/login")({
  component: Component,
  loader: async () => {
    const fingerprint = await commands.getFingerprint();
    return {
      code: window.crypto.randomUUID(),
      fingerprint,
    };
  },
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});

function Component() {
  const { code, fingerprint } = Route.useLoaderData();

  const handleSignIn = () => {
    const base = "http://127.0.0.1:3000";
    const u = new URL(base);
    u.pathname = "/auth/connect";
    u.searchParams.set("c", code);
    u.searchParams.set("f", fingerprint);
    open(u.toString());
  };

  return (
    <div>
      <RetroGrid angle={30} />
      {/* <AudioControls /> */}

      <div className="flex w-full flex-col items-center">
        <BlurFade delay={0.25} inView>
          <h1
            className="mb-12 text-center text-4xl font-bold"
            style={{ fontFamily: "'Racing Sans One', cursive" }}
          >
            <Trans>Welcome to</Trans>
            <SparklesText
              text="Hyprnote"
              className="text-black"
              colors={{ first: "#FFD700", second: "#8A2BE2" }}
            />
          </h1>
        </BlurFade>

        <BlurFade delay={0.75} inView>
          <ShimmerButton onClick={handleSignIn}>
            <Trans>Get Started</Trans>
          </ShimmerButton>
        </BlurFade>

        <Button variant="destructive">HI</Button>
      </div>
    </div>
  );
}
