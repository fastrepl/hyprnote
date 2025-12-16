import { useQuery } from "@tanstack/react-query";
import { arch, platform } from "@tauri-apps/plugin-os";

import { TextAnimate } from "@hypr/ui/components/ui/text-animate";

import type { StepProps } from "./config";

export function Welcome({ onNavigate }: StepProps) {
  const currentPlatform = platform();
  const archQuery = useQuery({
    queryKey: ["arch"],
    queryFn: () => arch(),
  });

  const isAppleSilicon =
    currentPlatform === "macos" && archQuery.data === "aarch64";

  return (
    <>
      <img
        src="/assets/logo.svg"
        alt="HYPRNOTE"
        className="mb-6 w-[300px]"
        draggable={false}
      />

      <TextAnimate
        animation="slideUp"
        by="word"
        once
        className="mb-16 text-center text-xl font-medium text-neutral-600"
      >
        Where Conversations Stay Yours
      </TextAnimate>

      <button
        onClick={() => onNavigate("login")}
        className="w-full py-3 rounded-full bg-gradient-to-t from-stone-600 to-stone-500 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
      >
        Get Started
      </button>

      {isAppleSilicon && (
        <button
          className="mt-4 text-sm text-neutral-400 transition-colors hover:text-neutral-600"
          onClick={() => onNavigate("configure-notice")}
        >
          Proceed without account
        </button>
      )}
    </>
  );
}
