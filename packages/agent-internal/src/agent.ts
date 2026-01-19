import { Command } from "@langchain/langgraph";

import { env } from "./env";
import { checkpointer, clearThread, graph, setupCheckpointer } from "./graph";
import type { AgentStateType } from "./state";
import { type AgentInput, getImages, parseRequest } from "./utils/input";

process.env.LANGSMITH_TRACING = env.LANGSMITH_API_KEY ? "true" : "false";

export function generateRunId(): string {
  return crypto.randomUUID();
}

export function getLangSmithUrl(threadId: string): string | null {
  if (!env.LANGSMITH_API_KEY || !env.LANGSMITH_ORG_ID) return null;
  return `https://smith.langchain.com/o/${env.LANGSMITH_ORG_ID}/projects/p/${env.LANGSMITH_PROJECT}?peekedConversationId=${threadId}`;
}

export { checkpointer, clearThread, setupCheckpointer };

export interface AgentOutput {
  output: string;
}

function isCommand(input: unknown): input is Command {
  return (
    typeof input === "object" &&
    input !== null &&
    "lg_name" in input &&
    (input as { lg_name: string }).lg_name === "Command"
  );
}

export const agent = {
  stream: (input: AgentInput, config?: Record<string, unknown>) => {
    const request = parseRequest(input);
    const images = getImages(input);

    const initialState: Partial<AgentStateType> = {
      request,
      images,
      messages: [],
      output: "",
    };

    return graph.stream(initialState, {
      ...config,
      streamMode: (config?.streamMode as string[]) ?? ["values"],
    });
  },

  invoke: async (
    input: AgentInput | Command,
    config?: Record<string, unknown>,
  ): Promise<AgentOutput> => {
    if (isCommand(input)) {
      const result = await graph.invoke(input, config);
      return { output: result.output };
    }

    const request = parseRequest(input);
    const images = getImages(input);

    const initialState: Partial<AgentStateType> = {
      request,
      images,
      messages: [],
      output: "",
    };

    const result = await graph.invoke(initialState, config);
    return { output: result.output };
  },
};
