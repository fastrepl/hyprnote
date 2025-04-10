import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Languages, Server } from "lucide-react";
import { useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { Input } from "@hypr/ui/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { Label } from "@hypr/ui/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";

interface EnhancingModelProps {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}

export function EnhancingModel({
  isRunning,
  queryClient,
}: EnhancingModelProps) {
  const [selectedModel, setSelectedModel] = useState("default");
  const [isConnecting, setIsConnecting] = useState(false);

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

  // Determine the available models to display
  const availableModels = ollamaModels.data || ["default"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-6 items-center justify-center">
              <Languages className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium">
                <Trans>Enhancing Model</Trans>
              </div>
              <div className="text-xs text-muted-foreground">
                <Trans>Run language models locally for enhanced privacy</Trans>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <div className="flex items-center gap-1.5">
                <div className="relative h-2 w-2">
                  <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
                  <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
                </div>
                <span className="text-xs text-green-600">
                  <Trans>Active</Trans>
                </span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleLocalLlm.mutate()}
                disabled={toggleLocalLlm.isPending}
                className="min-w-20 text-center"
              >
                {toggleLocalLlm.isPending ? (
                  <>
                    <Spinner />
                    <Trans>Loading...</Trans>
                  </>
                ) : (
                  <Trans>Start Server</Trans>
                )}
              </Button>
            )}
          </div>
        </div>

        {isRunning && (
          <div className="mt-2 space-y-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="local-models">
                <AccordionTrigger>
                  <Trans>Local Models</Trans>
                </AccordionTrigger>
                <AccordionContent className="py-4">
                  <div className="space-y-4">
                    {/* Ollama Connection Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          <h4 className="text-sm font-medium">
                            <Trans>Ollama Connection</Trans>
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {ollamaModels.data && ollamaModels.data.length > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <div className="relative h-2 w-2">
                                <div className="absolute inset-0 rounded-full bg-green-500/30"></div>
                                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
                              </div>
                              <span className="text-xs text-green-600">
                                <Trans>Connected</Trans>
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              <Trans>Not connected</Trans>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Model Selection Section */}
                    {ollamaModels.data && ollamaModels.data.length > 0 && (
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
                          {ollamaModels.isLoading ? (
                            <div className="flex items-center gap-2 py-1">
                              <Spinner className="h-4 w-4" />
                              <span className="text-sm text-muted-foreground">
                                <Trans>Loading models...</Trans>
                              </span>
                            </div>
                          ) : (
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
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
}
