import { useQuery } from "@tanstack/react-query";
import { arch, platform } from "@tauri-apps/plugin-os";
import { memo, useMemo } from "react";

import { TextAnimate } from "@hypr/ui/components/ui/text-animate";

import { Route } from "../../routes/app/onboarding";
import { getNext, type StepProps } from "./config";

export const STEP_ID_WELCOME = "welcome" as const;

export const Welcome = memo(function Welcome({ onNavigate }: StepProps) {
  const search = Route.useSearch();
  const currentPlatform = useMemo(() => platform(), []);
  const archQuery = useQuery({
    queryKey: ["arch"],
    queryFn: () => arch(),
  });

  const isAppleSilicon = useMemo(
    () => currentPlatform === "macos" && archQuery.data === "aarch64",
    [currentPlatform, archQuery.data],
  );

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
        onClick={() => onNavigate({ ...search, step: getNext(search) })}
        className="w-full py-3 rounded-full bg-gradient-to-t from-stone-600 to-stone-500 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
      >
        Get Started
      </button>

      {isAppleSilicon && (
        <button
          className="mt-4 text-sm text-neutral-400 transition-colors hover:text-neutral-600"
          onClick={() => {
            const next = { ...search, local: true };
            onNavigate({ ...next, step: getNext(next) });
          }}
        >
          Proceed without account
        </button>
      )}
    </>
  );
});
