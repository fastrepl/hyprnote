import { createFileRoute } from "@tanstack/react-router";

import { RetroGrid } from "../components/ui/retro-grid.tsx";
// import { AudioControls } from "../components/AudioControls";
import BlurFade from "../components/ui/blur-fade.tsx";
import SparklesText from "../components/ui/sparkles-text.tsx";
import ShimmerButton from "../components/ui/shimmer-button.tsx";
import { Trans } from "@lingui/react/macro";

export const Route = createFileRoute("/login")({
  component: Component,
});

function Component() {
  const handleSignIn = () => {};

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden text-black">
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
              colors={{ first: "#FFD700", second: "#8A2BE2" }}
            />
          </h1>
        </BlurFade>

        <BlurFade delay={0.75} inView>
          <ShimmerButton onClick={handleSignIn}>
            <Trans>Get Started</Trans>
          </ShimmerButton>
        </BlurFade>
      </div>
    </div>
  );
}
