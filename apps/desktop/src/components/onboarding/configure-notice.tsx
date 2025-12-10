import { Button } from "@hypr/ui/components/ui/button";

import { OnboardingContainer, type OnboardingNext } from "./shared";

type ConfigureNoticeProps = {
  onNext: OnboardingNext;
};

export function ConfigureNotice({ onNext }: ConfigureNoticeProps) {
  return (
    <OnboardingContainer
      title="You are not logged in"
      description="You need at least these to get started. With a free trial, no need to worry about configuration."
    >
      <div className="flex flex-col gap-2">
        <Requirement
          title="Language Model"
          description="Configure API key from OpenAI, OpenRouter, etc."
        />
        <Requirement
          title="Speech-to-Text Model"
          description="Configure API key from Deepgram, AssemblyAI, etc."
        />
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <Button
          size="lg"
          className="w-full"
          onClick={() => onNext({ local: false, step: "login" })}
        >
          Changed my mind. Let me sign up.
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => onNext()}
        >
          I understand. Let me continue.
        </Button>
      </div>
    </OnboardingContainer>
  );
}

export function Requirement({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border border-neutral-200 rounded-lg py-3 px-4 flex flex-col gap-1">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-neutral-500">{description}</p>
    </div>
  );
}
