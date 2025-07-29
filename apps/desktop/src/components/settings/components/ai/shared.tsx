import { Connection } from "@hypr/plugin-connector";
import { cn } from "@hypr/ui/lib/utils";
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";

export const RatingDisplay = (
  { label, rating, maxRating = 3, icon: Icon }: {
    label: string;
    rating: number;
    maxRating?: number;
    icon: React.ElementType;
  },
) => (
  <div className="flex flex-col items-center px-2">
    <span className="text-[10px] text-neutral-500 uppercase font-medium tracking-wider mb-1.5">{label}</span>
    <div className="flex space-x-1">
      {[...Array(maxRating)].map((_, i) => (
        <Icon
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < rating ? "text-black fill-current" : "text-neutral-300",
          )}
          strokeWidth={i < rating ? 0 : 1.5}
        />
      ))}
    </div>
  </div>
);

export const LanguageDisplay = ({ support }: { support: "multilingual" | "english-only" }) => {
  return (
    <div className="flex flex-col items-center px-2">
      <span className="text-[10px] text-neutral-500 uppercase font-medium tracking-wider mb-1.5">
        Language
      </span>
      <div className="text-xs font-medium">
        {support === "multilingual" ? "Multilingual" : "English Only"}
      </div>
    </div>
  );
};

export interface LLMModel {
  key: string;
  name: string;
  description: string;
  available: boolean;
  downloaded: boolean;
  size: string;
}

export interface STTModel {
  key: string;
  name: string;
  accuracy: number;
  speed: number;
  size: string;
  downloaded: boolean;
  fileName: string;
}

export type ConfigureEndpointConfig = {
  provider: "others" | "openai" | "gemini" | "openrouter";
  api_base: string;
  api_key?: string;
  model: string;
};

export type OpenAIFormValues = {
  api_key: string;
  model: string;
};

export type GeminiFormValues = {
  api_key: string;
  model: string;
};

export type OpenRouterFormValues = {
  api_key: string;
  model: string;
};

export type CustomFormValues = {
  api_base: string;
  api_key?: string;
  model: string;
};

export interface SharedSTTProps {
  selectedSTTModel: string;
  setSelectedSTTModel: (model: string) => void;
  sttModels: STTModel[];
  setSttModels: React.Dispatch<React.SetStateAction<STTModel[]>>;
  downloadingModels: Set<string>;
  handleModelDownload: (modelKey: string) => Promise<void>;
  handleShowFileLocation: (modelType: "stt" | "llm") => Promise<void>;
}

export interface SharedLLMProps {
  // Core State
  customLLMEnabled: UseQueryResult<boolean>;
  selectedLLMModel: string;
  setSelectedLLMModel: (model: string) => void;

  // Critical Mutations
  setCustomLLMEnabledMutation: UseMutationResult<null, Error, boolean, unknown>;

  // Model State
  downloadingModels: Set<string>;
  llmModelsState: LLMModel[];

  // Functions
  handleModelDownload: (modelKey: string) => Promise<void>;
  handleShowFileLocation: (modelType: "stt" | "llm") => Promise<void>;
}

export interface SharedCustomEndpointProps extends SharedLLMProps {
  // Custom Endpoint Configuration
  configureCustomEndpoint: (config: ConfigureEndpointConfig) => void;

  // Accordion State
  openAccordion: "others" | "openai" | "gemini" | "openrouter" | null;
  setOpenAccordion: (accordion: "others" | "openai" | "gemini" | "openrouter" | null) => void;

  // Queries
  customLLMConnection: UseQueryResult<Connection | null>;
  getCustomLLMModel: UseQueryResult<string | null>;
  availableLLMModels: UseQueryResult<string[]>;

  // Form instances for each provider
  openaiForm: UseFormReturn<OpenAIFormValues>;
  geminiForm: UseFormReturn<GeminiFormValues>;
  openrouterForm: UseFormReturn<OpenRouterFormValues>;
  customForm: UseFormReturn<CustomFormValues>;

  // Helper functions
  isLocalEndpoint: () => boolean;
}
