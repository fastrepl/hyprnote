import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generateText } from "ai";
import { Check, FlaskConical, Languages, Mic } from "lucide-react";
import { useState } from "react";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { Button } from "@hypr/ui/components/ui/button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { modelProvider } from "@hypr/utils";

export default function LocalAI() {
  const queryClient = useQueryClient();

  // For speech-to-text
  const sttRunning = useQuery({
    queryKey: ["local-stt", "running"],
    queryFn: async () => localSttCommands.isServerRunning(),
  });

  // For language model
  const llmRunning = useQuery({
    queryKey: ["local-llm", "running"],
    queryFn: async () => localLlmCommands.isServerRunning(),
  });

  return (
    <div className="space-y-6">
      <SpeechToTextDetails isRunning={!!sttRunning.data} queryClient={queryClient} />
      <LanguageModelContainer isRunning={!!llmRunning.data} queryClient={queryClient} />
    </div>
  );
}

function SpeechToTextDetails(
  { isRunning, queryClient }: { isRunning: boolean; queryClient: ReturnType<typeof useQueryClient> },
) {
  const toggleLocalStt = useMutation({
    mutationFn: async () => {
      if (!isRunning) {
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
              <Trans>Run speech recognition locally for enhanced privacy</Trans>
            </div>
          </div>
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
                onClick={() => toggleLocalStt.mutate()}
                disabled={toggleLocalStt.isPending}
                className="min-w-20 text-center"
              >
                {toggleLocalStt.isPending
                  ? (
                    <>
                      <Spinner className="mr-2" />
                      <Trans>Loading...</Trans>
                    </>
                  )
                  : <Trans>Start Server</Trans>}
              </Button>
            )}
        </div>
      </div>
    </div>
  );
}

function LanguageModelContainer(
  { isRunning, queryClient }: { isRunning: boolean; queryClient: ReturnType<typeof useQueryClient> },
) {
  // Check if model is loaded
  const modelLoadedQuery = useQuery({
    queryKey: ["local-llm", "model-loaded"],
    queryFn: async () => localLlmCommands.isModelDownloaded(),
    enabled: isRunning,
  });

  const modelLoaded = !!modelLoadedQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            <Languages className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>Local Language Model</Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              <Trans>Run language models locally for enhanced privacy</Trans>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && modelLoaded
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
              <LocalLlmButton
                isRunning={isRunning}
                modelLoaded={modelLoaded}
                queryClient={queryClient}
              />
            )}
        </div>
      </div>
      {isRunning && modelLoaded && (
        <div className="ml-4">
          <TestModelButton
            isRunning={isRunning}
            modelLoaded={modelLoaded}
          />
        </div>
      )}
    </div>
  );
}

function LocalLlmButton({
  isRunning,
  modelLoaded,
  queryClient,
}: {
  isRunning: boolean;
  modelLoaded: boolean;
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
      queryClient.invalidateQueries({ queryKey: ["local-llm", "model-loaded"] });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => toggleLocalLlmServer.mutate()}
      disabled={toggleLocalLlmServer.isPending || (isRunning && !modelLoaded)}
      className="min-w-20 text-center"
    >
      {toggleLocalLlmServer.isPending || (isRunning && !modelLoaded)
        ? (
          <>
            <Spinner className="mr-2" />
            <Trans>Loading...</Trans>
          </>
        )
        : <Trans>Start Server</Trans>}
    </Button>
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
