import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Channel } from "@tauri-apps/api/core";

import PastSessions from "@/components/past-sessions";
import UpcomingEvents from "@/components/upcoming-events";
import WorkspaceAIButton from "@/components/workspace-ai-button";

import { commands } from "@/types";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { commands as localLlmCommands } from "@hypr/plugin-local-llm";

export const Route = createFileRoute("/_nav/")({
  component: Component,
  beforeLoad: async () => {
    if (!import.meta.env.PROD) {
      return;
    }

    const isAuthenticated = await commands.isAuthenticated();

    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
});

function Component() {
  const [llmProgress, setLlmProgress] = useState<number>(0);
  const [sttProgress, setSttProgress] = useState<number>(0);

  useEffect(() => {
    const llmChannel = new Channel<number>();
    const sttChannel = new Channel<number>();

    llmChannel.onmessage = (progress) => setLlmProgress(progress);
    sttChannel.onmessage = (progress) => setSttProgress(progress);

    Promise.all([
      localLlmCommands.loadModel(llmChannel),
      localSttCommands.loadModel(sttChannel),
    ]).then(() => {
      console.log("Models loaded");
    });
  }, []);

  return (
    <main className="relative flex h-full flex-col overflow-hidden bg-white">
      <div className="overflow-y-auto px-8">
        <div className="mx-auto max-w-3xl">
          <UpcomingEvents />
          <PastSessions />
        </div>
      </div>
      <WorkspaceAIButton />

      <div className="absolute bottom-4 right-4 flex items-center">
        <div className="flex flex-col items-center gap-2">
          <div
            className="h-[100px] rounded-full bg-blue-500"
            style={{ width: `${llmProgress}%` }}
          />
          <div
            className="h-[100px] rounded-full bg-blue-500"
            style={{ width: `${sttProgress}%` }}
          />
        </div>
      </div>
    </main>
  );
}
