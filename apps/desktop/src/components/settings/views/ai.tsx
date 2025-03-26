import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generateText } from "ai";
import { Check, Cpu, FlaskConical, Languages, Mic } from "lucide-react";
import { useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@hypr/ui/components/ui/accordion";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { modelProvider } from "@hypr/utils";

const AI_FEATURES = ["speech-to-text", "language-model"] as const;
type AIFeature = typeof AI_FEATURES[number];

const MODEL_TYPES = ["local-llm", "ollama"] as const;
type ModelType = typeof MODEL_TYPES[number];

export default function LocalAI() {
  return (
    <div className="-mt-3">
      <ul className="flex flex-col px-1">
        {AI_FEATURES.map((feature) => (
          <li key={feature}>
            <AIFeature type={feature} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AIFeature({ type }: { type: AIFeature }) {
  const queryClient = useQueryClient();

  // For speech-to-text
  const sttRunning = useQuery({
    queryKey: ["local-stt", "running"],
    queryFn: async () => localSttCommands.isServerRunning(),
    enabled: type === "speech-to-text",
  });

  // For language model
  const llmRunning = useQuery({
    queryKey: ["local-llm", "running"],
    queryFn: async () => localLlmCommands.isServerRunning(),
    enabled: type === "language-model",
  });

  const isConnected = type === "speech-to-text"
    ? !!sttRunning.data
    : !!llmRunning.data;

  // Set the default value to open the accordion if not connected
  const defaultValue = !isConnected ? "item-1" : undefined;

  return (
    <Accordion type="single" collapsible defaultValue={defaultValue}>
      <AccordionItem value="item-1">
        <AccordionTrigger>
          <AIFeatureIconWithText type={type} isConnected={isConnected} />
        </AccordionTrigger>
        <AccordionContent className="px-2">
          {type === "speech-to-text"
            ? <SpeechToTextDetails isRunning={!!sttRunning.data} queryClient={queryClient} />
            : <LanguageModelContainer queryClient={queryClient} isRunning={!!llmRunning.data} />}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function SpeechToTextDetails(
  { isRunning, queryClient }: { isRunning: boolean; queryClient: ReturnType<typeof useQueryClient> },
) {
  const toggleLocalStt = useMutation({
    mutationFn: async () => {
      if (isRunning) {
        await localSttCommands.stopServer();
      } else {
        await localSttCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-stt", "running"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>Local Speech-to-Text</Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              {isRunning
                ? <Trans>Server is running</Trans>
                : <Trans>Run speech recognition locally for enhanced privacy</Trans>}
            </div>
          </div>
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleLocalStt.mutate()}
            disabled={toggleLocalStt.isPending}
            className="min-w-20 text-center"
          >
            {toggleLocalStt.isPending
              ? <Spinner />
              : isRunning
              ? <Trans>Stop Server</Trans>
              : <Trans>Start Server</Trans>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LanguageModelContainer(
  { isRunning, queryClient }: { isRunning: boolean; queryClient: ReturnType<typeof useQueryClient> },
) {
  return (
    <div className="space-y-4">
      {MODEL_TYPES.map((modelType) => (
        <ModelIntegration
          key={modelType}
          type={modelType}
          isLlmRunning={isRunning}
          queryClient={queryClient}
        />
      ))}
      {isRunning && (
        <TestModelButton
          isRunning={isRunning}
          modelLoaded={!!queryClient.getQueryState(["local-llm", "model-loaded"])?.data}
        />
      )}
    </div>
  );
}

function ModelIntegration({ type, isLlmRunning, queryClient }: {
  type: ModelType;
  isLlmRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-6 items-center justify-center">
          {type === "local-llm" ? <Cpu className="h-4 w-4" /> : (
            <img
              src="/icons/ollama.svg"
              alt="Ollama"
              className="h-4 w-4"
            />
          )}
        </div>
        <div>
          <div className="text-sm font-medium">
            {type === "local-llm" ? <Trans>Local Language Model</Trans> : <Trans>Ollama</Trans>}
          </div>
          <div className="text-xs text-muted-foreground">
            {type === "local-llm"
              ? (
                isLlmRunning
                  ? <ModelLoadedStatus queryClient={queryClient} />
                  : <Trans>Run language models locally for enhanced privacy</Trans>
              )
              : <Trans>Connect to your local Ollama instance to use your own models</Trans>}
          </div>
        </div>
      </div>
      <div>
        {type === "local-llm" ? <LocalLlmButton isRunning={isLlmRunning} queryClient={queryClient} /> : (
          <Button
            variant="outline"
            size="sm"
            className="min-w-20 text-center"
          >
            <Trans>Connect</Trans>
          </Button>
        )}
      </div>
    </div>
  );
}

function ModelLoadedStatus({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  // Check if model is loaded
  const modelLoadedQuery = useQuery({
    queryKey: ["local-llm", "model-loaded"],
    queryFn: async () => localLlmCommands.isModelDownloaded(),
  });

  const modelLoaded = !!modelLoadedQuery.data;

  return modelLoaded ? <Trans>Model loaded and ready</Trans> : <Trans>Server is running</Trans>;
}

function LocalLlmButton({ isRunning, queryClient }: {
  isRunning: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const toggleLocalLlmServer = useMutation({
    mutationFn: async () => {
      if (isRunning) {
        await localLlmCommands.stopServer();
      } else {
        await localLlmCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-llm", "running"] });
      queryClient.invalidateQueries({ queryKey: ["local-llm", "model-loaded"] });
    },
  });

  // Check if model is loaded
  const modelLoadedQuery = useQuery({
    queryKey: ["local-llm", "model-loaded"],
    queryFn: async () => localLlmCommands.isModelDownloaded(),
    enabled: isRunning,
  });

  const modelLoaded = !!modelLoadedQuery.data;

  return (
    <>
      {isRunning
        ? (
          modelLoaded
            ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleLocalLlmServer.mutate()}
                  disabled={toggleLocalLlmServer.isPending}
                  className="min-w-20 text-center"
                >
                  {toggleLocalLlmServer.isPending
                    ? <Spinner />
                    : <Trans>Stop Server</Trans>}
                </Button>
              </div>
            )
            : (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="min-w-20 text-center"
              >
                <Spinner className="mr-2" />
                <Trans>Loading...</Trans>
              </Button>
            )
        )
        : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleLocalLlmServer.mutate()}
            disabled={toggleLocalLlmServer.isPending}
            className="min-w-20 text-center"
          >
            {toggleLocalLlmServer.isPending
              ? <Spinner />
              : <Trans>Start Server</Trans>}
          </Button>
        )}
    </>
  );
}

function TestModelButton({ isRunning, modelLoaded }: { isRunning: boolean; modelLoaded: boolean }) {
  const [testSuccess, setTestSuccess] = useState(false);

  const checkLLM = useMutation({
    mutationFn: async () => {
      const provider = await modelProvider();
      const { text } = await generateText({
        model: provider.languageModel("any"),
        messages: [{ role: "user", content: "generate just 3 sentences" }],
      });

      console.log(text);
      if (!text) {
        throw new Error("no text");
      }
      return text;
    },
    onError: (error) => {
      console.error(error);
      setTestSuccess(false);
    },
    onSuccess: () => {
      setTestSuccess(true);
    },
  });

  if (!isRunning || !modelLoaded) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border p-4 mt-4">
      <div className="flex items-center gap-3">
        <div className="flex size-6 items-center justify-center">
          <FlaskConical className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">
            <Trans>Test Language Model</Trans>
          </div>
          <div className="text-xs text-muted-foreground">
            {testSuccess
              ? <Trans>Model is working correctly</Trans>
              : <Trans>Verify that your local language model is working correctly</Trans>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {testSuccess
          ? <Check className="text-green-500 h-4 w-4" />
          : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkLLM.mutate()}
              disabled={checkLLM.isPending}
              className="min-w-20 text-center"
            >
              {checkLLM.isPending
                ? (
                  <>
                    <Spinner className="mr-2" />
                    <Trans>Testing...</Trans>
                  </>
                )
                : <Trans>Test Model</Trans>}
            </Button>
          )}
      </div>
    </div>
  );
}

function AIFeatureIconWithText({ type, isConnected }: { type: AIFeature; isConnected: boolean }) {
  const Icon = type === "speech-to-text" ? Mic : Languages;
  const title = type === "speech-to-text" ? <Trans>Speech-to-Text</Trans> : <Trans>Language Models</Trans>;

  return (
    <div className="flex items-center gap-2">
      <div className="flex size-5 items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium">
        {title}
      </span>
      {isConnected && (
        <span className="ml-auto text-xs text-green-600">
          <Trans>Running</Trans>
        </span>
      )}
    </div>
  );
}
