import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import {
  commands as localSttCommands,
  type SupportedSttModel,
} from "@hypr/plugin-local-stt";
import { cn } from "@hypr/utils";

import { Route } from "../../routes/app/onboarding";
import * as settings from "../../store/tinybase/settings";
import { getBack, getNext, type StepProps } from "./config";
import { OnboardingContainer } from "./shared";

export const STEP_ID_CONFIGURE_NOTICE = "configure-notice" as const;

const sttModelQueries = {
  isDownloaded: (model: SupportedSttModel) => ({
    refetchInterval: 1000,
    queryKey: ["stt", "model", model, "downloaded"],
    queryFn: () => localSttCommands.isModelDownloaded(model),
    select: (result: { status: string; data?: boolean; error?: string }) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  }),
  isDownloading: (model: SupportedSttModel) => ({
    refetchInterval: 1000,
    queryKey: ["stt", "model", model, "downloading"],
    queryFn: () => localSttCommands.isModelDownloading(model),
    select: (result: { status: string; data?: boolean; error?: string }) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  }),
};

export function ConfigureNotice({ onNavigate }: StepProps) {
  const search = Route.useSearch();
  const backStep = getBack(search);

  if (search.local) {
    return (
      <LocalConfigureNotice
        onNavigate={onNavigate}
        onBack={
          backStep ? () => onNavigate({ ...search, step: backStep }) : undefined
        }
      />
    );
  }

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

function LocalConfigureNotice({
  onNavigate,
  onBack,
}: {
  onNavigate: StepProps["onNavigate"];
  onBack?: () => void;
}) {
  const search = Route.useSearch();
  const [selectedModel, setSelectedModel] = useState<SupportedSttModel | null>(
    null,
  );

  const handleSelectProvider = settings.UI.useSetValueCallback(
    "current_stt_provider",
    (provider: string) => provider,
    [],
    settings.STORE_ID,
  );

  const handleSelectModel = settings.UI.useSetValueCallback(
    "current_stt_model",
    (model: string) => model,
    [],
    settings.STORE_ID,
  );

  // Check if models are already downloaded
  const p2Downloaded = useQuery(sttModelQueries.isDownloaded("am-parakeet-v2"));
  const p3Downloaded = useQuery(sttModelQueries.isDownloaded("am-parakeet-v3"));

  // Auto-skip if any model is already downloaded
  useEffect(() => {
    if (p2Downloaded.data || p3Downloaded.data) {
      // If a model is already downloaded, just move to the next step
      onNavigate({ ...search, step: getNext(search) });
    }
  }, [p2Downloaded.data, p3Downloaded.data, search, onNavigate]);

  const handleUseModel = useCallback(() => {
    if (!selectedModel) return;

    handleSelectProvider("hyprnote");
    handleSelectModel(selectedModel);
    void localSttCommands.downloadModel(selectedModel);
    onNavigate({ ...search, step: getNext(search) });
  }, [
    selectedModel,
    search,
    onNavigate,
    handleSelectProvider,
    handleSelectModel,
  ]);

  // Show loading state while checking if models are downloaded
  if (p2Downloaded.isLoading || p3Downloaded.isLoading) {
    return (
      <OnboardingContainer
        title="Checking for existing models..."
        onBack={onBack}
      >
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-500"></div>
        </div>
      </OnboardingContainer>
    );
  }

  return (
    <OnboardingContainer
      title="Help Hyprnote listen to your conversations"
      description="Select a speech-to-text model to download"
      onBack={onBack}
    >
      <div className="flex flex-col gap-3">
        <LocalModelRow
          model="am-parakeet-v2"
          displayName="Parakeet v2"
          description="Best for English"
          isSelected={selectedModel === "am-parakeet-v2"}
          onSelect={() => setSelectedModel("am-parakeet-v2")}
        />
        <LocalModelRow
          model="am-parakeet-v3"
          displayName="Parakeet v3"
          description="Better for European languages"
          isSelected={selectedModel === "am-parakeet-v3"}
          onSelect={() => setSelectedModel("am-parakeet-v3")}
        />
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <button
          onClick={handleUseModel}
          disabled={!selectedModel}
          className={cn([
            "w-full py-3 rounded-full text-white text-sm font-medium duration-150",
            selectedModel
              ? "bg-gradient-to-t from-stone-600 to-stone-500 hover:scale-[1.01] active:scale-[0.99]"
              : "bg-gray-300 cursor-not-allowed opacity-50",
          ])}
        >
          Use this model
        </button>
      </div>
    </OnboardingContainer>
  );
}

function LocalModelRow({
  model,
  displayName,
  description,
  isSelected,
  onSelect,
}: {
  model: SupportedSttModel;
  displayName: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isDownloaded = useQuery(sttModelQueries.isDownloaded(model));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn([
        "relative border rounded-xl py-3 px-4 flex flex-col gap-1 text-left transition-all cursor-pointer",
        isSelected
          ? "border-stone-500 bg-stone-50"
          : "border-neutral-200 hover:border-neutral-300",
      ])}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-neutral-500 flex-1">{description}</p>
        </div>
        {isDownloaded.data && (
          <span className="text-xs text-green-600 font-medium">
            Already downloaded
          </span>
        )}
      </div>
    </div>
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
