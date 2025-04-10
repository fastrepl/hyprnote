import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { Label } from "@hypr/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { Spinner } from "@hypr/ui/components/ui/spinner";

interface ModelSelectionProps {
  isRunning: boolean;
}

export function ModelSelection({ isRunning }: ModelSelectionProps) {
  const [selectedModel, setSelectedModel] = useState("default");

  const ollamaModels = useQuery({
    queryKey: ["ollama", "models"],
    queryFn: async () => {
      try {
        const models = await localLlmCommands.listOllamaModels();
        return models.length > 0 ? models : ["default"];
      } catch (error) {
        console.error("Failed to fetch Ollama models:", error);
        return ["default"];
      }
    },
    enabled: isRunning,
  });

  // Determine the available models to display
  const availableModels = ollamaModels.data || ["default"];

  if (!isRunning) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">
          <Trans>Available Models</Trans>
        </h4>
        <div className="text-xs text-muted-foreground">
          <Trans>Choose from our curated AI models</Trans>
        </div>
      </div>

      <RadioGroup
        value={selectedModel}
        onValueChange={setSelectedModel}
        disabled={ollamaModels.isLoading}
        className="space-y-2"
      >
        {ollamaModels.isLoading
          ? (
            <div className="flex items-center gap-2 py-1">
              <Spinner className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">
                <Trans>Loading models...</Trans>
              </span>
            </div>
          )
          : (
            availableModels.map((model) => (
              <div key={model} className="flex items-center space-x-2">
                <RadioGroupItem value={model} id={`model-${model}`} />
                <Label
                  htmlFor={`model-${model}`}
                  className="flex items-center cursor-pointer"
                >
                  <span>{model}</span>
                </Label>
              </div>
            ))
          )}
      </RadioGroup>
    </div>
  );
}
