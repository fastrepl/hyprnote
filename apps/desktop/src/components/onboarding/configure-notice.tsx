import { Route } from "../../routes/app/onboarding";
import { getBack, getNext, type StepProps } from "./config";
import { OnboardingContainer } from "./shared";

export const STEP_ID_CONFIGURE_NOTICE = "configure-notice" as const;

export function ConfigureNotice({ onNavigate }: StepProps) {
  const search = Route.useSearch();
  const backStep = getBack(search);

  return (
    <OnboardingContainer
      title="AI models are needed for best experience"
      onBack={
        backStep ? () => onNavigate({ ...search, step: backStep }) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <Requirement
          title="Speech-to-Text Model"
          description="Deepgram, AssemblyAI, etc."
          required
        />
        <Requirement
          title="Language Model"
          description="OpenAI, OpenRouter etc."
        />
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <button
          onClick={() => onNavigate({ ...search, step: getNext(search) })}
          className="w-full py-3 rounded-full bg-gradient-to-t from-stone-600 to-stone-500 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
        >
          I will configure it later
        </button>
      </div>
    </OnboardingContainer>
  );
}

function Requirement({
  title,
  description,
  required,
}: {
  title: string;
  description: string;
  required?: boolean;
}) {
  return (
    <div className="relative border border-neutral-200 rounded-xl py-3 px-4 flex flex-col gap-1">
      {required ? (
        <span className="absolute -top-2 left-3 px-1.5 bg-white text-xs text-red-500">
          Required
        </span>
      ) : (
        <span className="absolute -top-2 left-3 px-1.5 bg-white text-xs text-neutral-400">
          Optional
        </span>
      )}
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-neutral-500">{description}</p>
    </div>
  );
}
