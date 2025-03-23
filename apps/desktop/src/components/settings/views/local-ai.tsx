import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generateText } from "ai";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { modelProvider } from "@hypr/utils";

export default function LocalAI() {
  const queryClient = useQueryClient();

  const sttRunning = useQuery({
    queryKey: ["local-stt", "running"],
    queryFn: async () => localSttCommands.isServerRunning(),
  });

  const llmRunning = useQuery({
    queryKey: ["local-llm", "running"],
    queryFn: async () => localLlmCommands.isServerRunning(),
  });

  const toggleLocalStt = useMutation({
    mutationFn: async () => {
      if (sttRunning.data) {
        await localSttCommands.stopServer();
      } else {
        await localSttCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-stt", "running"] });
    },
  });

  const toggleLocalLlmServer = useMutation({
    mutationFn: async () => {
      if (llmRunning.data) {
        await localLlmCommands.stopServer();
      } else {
        await localLlmCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-llm", "running"] });
    },
  });

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
    },
    onError: (error) => {
      console.error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-llm", "status"] });
    },
  });

  return (
    <div>
      <h1>Local AI</h1>

      <h2>Local STT</h2>
      <div>{JSON.stringify(sttRunning.data)}</div>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={() => toggleLocalStt.mutate()}
      >
        {sttRunning.data ? "Stop Server" : "Start Server"}
      </button>

      <h2>Local LLM</h2>
      <div>{JSON.stringify(llmRunning.data)}</div>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={() => toggleLocalLlmServer.mutate()}
      >
        {llmRunning.data ? "Stop Server" : "Start Server"}
      </button>

      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={() => checkLLM.mutate()}
      >
        Check LLM
      </button>
    </div>
  );
}
