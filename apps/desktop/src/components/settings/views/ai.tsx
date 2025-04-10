import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Languages, Server } from "lucide-react";
import { useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { RadioGroup, RadioGroupItem } from "@hypr/ui/components/ui/radio-group";
import { Label } from "@hypr/ui/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@hypr/ui/components/ui/accordion";

// Import the TranscribingModel and EnhancingModel from the correct path
import { TranscribingModel } from "../components/ai/transcribing-model";
import { EnhancingModel } from "../components/ai/enhancing-model";

export default function LocalAI() {
  const queryClient = useQueryClient();

  const sttRunning = useQuery({
    queryKey: ["local-stt", "running"],
    queryFn: async () => localSttCommands.isServerRunning(),
    refetchInterval: 3000,
  });

  const llmRunning = useQuery({
    queryKey: ["local-llm", "running"],
    queryFn: async () => localLlmCommands.isServerRunning(),
    refetchInterval: 3000,
  });

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible defaultValue="local">
        <AccordionItem value="local">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">
                <Trans>Local AI</Trans>
              </h3>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pt-4">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                <Trans>
                  Configure local AI models for enhanced privacy and offline
                  capabilities
                </Trans>
              </p>
              
              <TranscribingModel
                isRunning={!!sttRunning.data}
                queryClient={queryClient}
              />
              <EnhancingModel
                isRunning={!!llmRunning.data}
                queryClient={queryClient}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function LanguageModelContainer({
  isRunning,
  queryClient,
}: {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [activeAccordion, setActiveAccordion] =
    useState<string>("local-models");

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
                <Trans>Enhancing model</Trans>
              </div>
              <div className="text-xs text-muted-foreground">
                <Trans>Run AI models locally for enhanced privacy</Trans>
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
              <LocalLlmButton isRunning={isRunning} queryClient={queryClient} />
            )}
          </div>
        </div>

        {isRunning && (
          <div className="mt-2">
            <Accordion
              type="single"
              collapsible
              value={activeAccordion}
              onValueChange={setActiveAccordion}
              className="w-full"
            >
              <AccordionItem value="local-models" className="border-b-0">
                <AccordionTrigger className="py-2 text-sm">
                  <Trans>Local Models</Trans>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 pb-1">
                    <ModelSelectionDropdown isRunning={isRunning} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ollama" className="border-b-0">
                <AccordionTrigger className="py-2 text-sm">
                  <Trans>Ollama</Trans>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 pb-1">
                    <OllamaConnectionButton
                      isRunning={isRunning}
                      queryClient={queryClient}
                    />
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

function LocalLlmButton({
  isRunning,
  queryClient,
}: {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const toggleLocalLlmServer = useMutation({
    mutationFn: async () => {
      if (!isRunning) {
        await localLlmCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-llm", "running"] });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => toggleLocalLlmServer.mutate()}
      disabled={toggleLocalLlmServer.isPending}
      className="min-w-20 text-center"
    >
      {toggleLocalLlmServer.isPending ? (
        <>
          <Spinner />
          <Trans>Loading...</Trans>
        </>
      ) : (
        <Trans>Start Server</Trans>
      )}
    </Button>
  );
}

function ModelSelectionDropdown({ isRunning }: { isRunning: boolean }) {
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

  // Determine the current model to display
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
  );
}

function OllamaConnectionButton({
  isRunning,
  queryClient,
}: {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [hasModels, setHasModels] = useState(false);

  const ollamaConnection = useMutation({
    mutationFn: async () => {
      if (isConnected) {
        // Disconnect from Ollama
        // Implement actual disconnect logic here
        setIsConnected(false);
        return;
      }

      // Connect to Ollama
      // Check if Ollama is running and has at least one model
      try {
        // Implement actual connection logic here
        // This is a placeholder for the actual implementation
        const ollamaRunning = true; // Replace with actual check
        const ollamaHasModels = true; // Replace with actual check

        if (!ollamaRunning) {
          throw new Error("Ollama is not running");
        }

        if (!ollamaHasModels) {
          setHasModels(false);
          throw new Error("No models installed in Ollama");
        }

        setHasModels(true);
        setIsConnected(true);
        return true;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
  });

  if (!isRunning) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-6 items-center justify-center">
          <Server className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">Ollama</div>
          <div className="text-xs text-muted-foreground">
            {isConnected ? (
              <Trans>Connected to Ollama</Trans>
            ) : (
              <Trans>
                Ollama must be running with at least one model installed
              </Trans>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!hasModels && ollamaConnection.isError && (
          <span className="text-xs text-red-500">
            <Trans>No models found</Trans>
          </span>
        )}
        <Button
          variant={isConnected ? "destructive" : "outline"}
          size="sm"
          onClick={() => ollamaConnection.mutate()}
          disabled={ollamaConnection.isPending}
          className="w-20 text-center"
        >
          {ollamaConnection.isPending ? (
            <>
              <Spinner />
              <Trans>Loading...</Trans>
            </>
          ) : isConnected ? (
            <Trans>Disconnect</Trans>
          ) : (
            <Trans>Connect</Trans>
          )}
        </Button>
      </div>
    </div>
  );
}
