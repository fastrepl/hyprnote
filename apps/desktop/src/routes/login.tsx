import { createFileRoute } from "@tanstack/react-router";
import { RiGoogleFill, RiAppleFill } from "@remixicon/react";
import { useTranslation } from "react-i18next";

import { RetroGrid } from "../components/ui/retro-grid.tsx";
import { AudioControls } from "../components/AudioControls";
import BlurFade from "../components/ui/blur-fade.tsx";
import SparklesText from "../components/ui/sparkles-text.tsx";
import ShimmerButton from "../components/ui/shimmer-button.tsx";

export const Route = createFileRoute("/login")({
  component: Component,
});

function Component() {
  const { t } = useTranslation();

  const handleSignIn = () => {};

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden text-black">
      <RetroGrid angle={30} />

      <AudioControls />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center rounded-2xl p-8">
        <BlurFade delay={0.25} inView>
          <h1
            className="mb-8 text-center text-4xl font-bold"
            style={{ fontFamily: "'Racing Sans One', cursive" }}
          >
            {t("common.welcome")}{" "}
            <SparklesText
              text="Hyprnote"
              colors={{ first: "#FFD700", second: "#8A2BE2" }}
            />
          </h1>
        </BlurFade>

        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <ShimmerButton
            onClick={handleSignIn}
            className="flex flex-1 items-center justify-center gap-2"
          >
            <RiGoogleFill size={20} />
            <span>{t("auth.continueWith", { provider: "Google" })}</span>
          </ShimmerButton>

          <ShimmerButton
            onClick={handleSignIn}
            className="flex flex-1 items-center justify-center gap-2"
          >
            <RiAppleFill size={20} />
            <span>{t("auth.continueWith", { provider: "Apple" })}</span>
          </ShimmerButton>
        </div>
      </div>
    </div>
  );
}
