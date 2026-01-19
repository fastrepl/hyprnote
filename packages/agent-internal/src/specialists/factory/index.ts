import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import {
  Annotation,
  messagesStateReducer,
  StateGraph,
  START,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

import { env } from "../../env";
import { compilePrompt, loadPrompt, type PromptConfig } from "../../prompt";
import { isRetryableError, type SpecialistConfig } from "../../types";
import { compressMessages } from "../../utils/context";
import { executeCodeTool } from "./tools";

const SpecialistState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  request: Annotation<string>({
    reducer: (_, newValue) => newValue ?? "",
    default: () => "",
  }),
  context: Annotation<Record<string, unknown>>({
    reducer: (_, newValue) => newValue ?? {},
    default: () => ({}),
  }),
  output: Annotation<string>({
    reducer: (_, newValue) => newValue ?? "",
    default: () => "",
  }),
});

type SpecialistStateType = typeof SpecialistState.State;

function createModel(promptConfig: PromptConfig) {
  return new ChatOpenAI({
    model: promptConfig.model ?? "anthropic/claude-opus-4.5",
    temperature: promptConfig.temperature ?? 0,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
    },
  }).bindTools([executeCodeTool]);
}

function createSpecialistAgentNode(promptDir: string) {
  const prompt = loadPrompt(promptDir);

  return async (
    state: SpecialistStateType,
  ): Promise<Partial<SpecialistStateType>> => {
    const compressedMessages = await compressMessages(state.messages);

    let messages = compressedMessages;
    const isFirstInvocation = compressedMessages.length === 0;

    if (isFirstInvocation) {
      const { messages: promptMessages } = await compilePrompt(prompt, {
        request: state.request,
        ...state.context,
      });
      messages = promptMessages;
    }

    const promptConfig: PromptConfig = {
      model: "anthropic/claude-opus-4.5",
      temperature: 0,
    };
    const model = createModel(promptConfig);

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const response = (await model.invoke(messages)) as AIMessage;

        if (!response.tool_calls || response.tool_calls.length === 0) {
          return {
            messages: [response],
            output: response.text || "No response",
          };
        }

        return {
          messages: [response],
        };
      } catch (error) {
        attempts++;
        if (!isRetryableError(error) || attempts >= maxAttempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error("Model invocation failed after retries");
  };
}

async function specialistToolsNode(
  state: SpecialistStateType,
): Promise<Partial<SpecialistStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage._getType() !== "ai" || !("tool_calls" in lastMessage)) {
    throw new Error("Expected AIMessage with tool_calls");
  }

  const toolCalls =
    (
      lastMessage as {
        tool_calls?: Array<{ id: string; name: string; args: Record<string, unknown> }>;
      }
    ).tool_calls ?? [];

  const toolMessages = await Promise.all(
    toolCalls.map(async (toolCall) => {
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        try {
          const args = toolCall.args as { code: string; isMutating: boolean };
          const result = await executeCodeTool.invoke(args);
          return new ToolMessage({
            content:
              typeof result === "string" ? result : JSON.stringify(result),
            tool_call_id: toolCall.id,
          });
        } catch (error) {
          attempts++;
          if (!isRetryableError(error) || attempts >= maxAttempts) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(`executeCode failed:`, errorMessage);
            return new ToolMessage({
              content: `Code execution failed: ${errorMessage}`,
              tool_call_id: toolCall.id,
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return new ToolMessage({
        content: "Tool execution failed after retries",
        tool_call_id: toolCall.id,
      });
    }),
  );

  return {
    messages: toolMessages,
  };
}

function shouldContinue(state: SpecialistStateType): "tools" | "__end__" {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage._getType() === "ai") {
    const aiMessage = lastMessage as { tool_calls?: unknown[] };
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      return "tools";
    }
  }

  return "__end__";
}

export function createSpecialist(config: SpecialistConfig) {
  const agentNode = createSpecialistAgentNode(config.promptDir);

  const workflow = new StateGraph(SpecialistState)
    .addNode("agent", agentNode)
    .addNode("tools", specialistToolsNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      __end__: "__end__",
    })
    .addEdge("tools", "agent");

  const graph = workflow.compile({
    checkpointer: config.checkpointer,
  });

  return {
    stream: async (request: string, streamConfig?: Record<string, unknown>) => {
      const context = config.getContext ? await config.getContext() : {};
      const initialState: Partial<SpecialistStateType> = {
        request,
        context,
        messages: [],
        output: "",
      };
      return graph.stream(initialState, {
        ...streamConfig,
        streamMode: (streamConfig?.streamMode as string[]) ?? ["values"],
      });
    },

    invoke: async (
      request: string,
      invokeConfig?: Record<string, unknown>,
    ): Promise<string> => {
      const context = config.getContext ? await config.getContext() : {};
      const initialState: Partial<SpecialistStateType> = {
        request,
        context,
        messages: [],
        output: "",
      };
      const result = await graph.invoke(initialState, invokeConfig);
      return result.output;
    },
  };
}
