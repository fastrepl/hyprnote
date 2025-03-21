import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Channel } from "@tauri-apps/api/core";
import { generateText } from "ai";

import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { modelProvider } from "@hypr/utils";

export default function LocalAI() {
  const queryClient = useQueryClient();

  const localSttStatus = useQuery({
    queryKey: ["local-stt", "status"],
    queryFn: async () => localSttCommands.isServerRunning(),
  });

  const localLlmStatus = useQuery({
    queryKey: ["local-llm", "status"],
    queryFn: async () => localLlmCommands.getStatus(),
  });

  const toggleLocalStt = useMutation({
    mutationFn: async () => {
      if (localSttStatus.data) {
        await localSttCommands.stopServer();
      } else {
        await localSttCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-stt", "status"] });
    },
  });

  const toggleLocalLlmServer = useMutation({
    mutationFn: async () => {
      if (localLlmStatus.data?.server_running) {
        await localLlmCommands.stopServer();
      } else {
        await localLlmCommands.startServer();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-llm", "status"] });
    },
  });

  const toggleLocalLlmModel = useMutation({
    mutationFn: async () => {
      if (localLlmStatus.data?.model_loaded) {
        await localLlmCommands.unloadModel();
      } else {
        const channel = new Channel<number>();
        await localLlmCommands.loadModel(channel);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-llm", "status"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-llm", "status"] });
    },
  });

  return (
    <div>
      <h1>Local AI</h1>

      <h2>Local STT</h2>
      <div>{JSON.stringify(localSttStatus.data)}</div>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={() => toggleLocalStt.mutate()}
      >
        {localSttStatus.data ? "Stop Server" : "Start Server"}
      </button>

      <h2>Local LLM</h2>
      <div>{JSON.stringify(localLlmStatus.data)}</div>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={() => toggleLocalLlmServer.mutate()}
      >
        {localLlmStatus.data?.server_running ? "Stop Server" : "Start Server"}
      </button>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={() => toggleLocalLlmModel.mutate()}
      >
        {localLlmStatus.data?.model_loaded ? "Unload Model" : "Load Model"}
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
