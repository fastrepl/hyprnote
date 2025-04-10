import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Languages, Server } from "lucide-react";
import { useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { Button } from "@hypr/ui/components/ui/button";
import { Label } from "@hypr/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { Spinner } from "@hypr/ui/components/ui/spinner";

interface EnhancingModelProps {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}

export function EnhancingModel({
  isRunning,
  queryClient,
}: EnhancingModelProps) {
  const [selectedModel, setSelectedModel] = useState("default");

  const toggleLocalLlm = useMutation({
    mutationFn: async () => {
      if (!isRunning) {
        await localLlmCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-llm", "running"] });
    },
  });

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

  const connectToOllama = useMutation({
    mutationFn: async () => {
      // This would be the actual connection logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ollama", "models"] });
    },
  });

  const availableModels = ollamaModels.data || ["default"];
  const isOllamaConnected = ollamaModels.data && ollamaModels.data.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-sm font-medium">
            <Languages className="h-4 w-4" />
            <Trans>Enhancing Model</Trans>
          </div>
          <div className="flex items-center gap-2">
            {isRunning
              ? (
                <div className="flex items-center gap-1.5">
                  <div className="relative h-2 w-2">
                    <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
                    <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
                  </div>
                  <span className="text-xs text-green-600">
                    <Trans>Active</Trans>
                  </span>
                </div>
              )
              : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleLocalLlm.mutate()}
                  disabled={toggleLocalLlm.isPending}
                  className="min-w-20 text-center"
                >
                  {toggleLocalLlm.isPending
                    ? (
                      <>
                        <Spinner />
                        <Trans>Loading...</Trans>
                      </>
                    )
                    : <Trans>Start Server</Trans>}
                </Button>
              )}
          </div>
        </div>

        {isRunning && (
          <div className="mt-2 pl-2">
            <div className="space-y-4">
              {/* Local Models Section */}
              {availableModels.length > 0 && (
                <RadioGroup
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={ollamaModels.isLoading}
                  className="space-y-2"
                >
                  {availableModels.map((model) => (
                    <div key={model} className="flex items-center space-x-2">
                      <RadioGroupItem value={model} id={`model-${model}`} />
                      <Label
                        htmlFor={`model-${model}`}
                        className="flex items-center cursor-pointer"
                      >
                        <span>{model}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              <div className="relative">
                <div className="border-t border-gray-200 dark:border-gray-700 absolute top-1/2 left-0 right-0"></div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-2 text-xs text-muted-foreground">
                    <Trans>or</Trans>
                  </span>
                </div>
              </div>

              {/* Ollama Connection Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <span className="text-sm">
                    <Trans>Connect to Ollama</Trans>
                  </span>
                </div>

                <Button
                  variant={isOllamaConnected ? "outline" : "default"}
                  size="sm"
                  onClick={() => !isOllamaConnected && connectToOllama.mutate()}
                  disabled={ollamaModels.isLoading || connectToOllama.isPending}
                  className="w-20 text-center"
                >
                  {ollamaModels.isLoading || connectToOllama.isPending
                    ? (
                      <>
                        <Spinner className="mr-1 h-3 w-3" />
                        <Trans>Connecting...</Trans>
                      </>
                    )
                    : isOllamaConnected
                    ? <Trans>Connected</Trans>
                    : <Trans>Connect</Trans>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
