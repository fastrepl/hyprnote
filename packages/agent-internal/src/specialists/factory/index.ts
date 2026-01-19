import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import {
  Annotation,
  END,
  messagesStateReducer,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { randomUUID } from "crypto";

import { env } from "../../env";
import { compilePrompt, loadPrompt, type PromptConfig } from "../../prompt";
import { isRetryableError, type SpecialistConfig } from "../../types";
import { compressMessages } from "../../utils/context";
import { executeCodeTool } from "./tools";

function ensureMessageIds(messages: BaseMessage[]): BaseMessage[] {
  return messages.map((m) => {
    if (!m.id) {
      m.id = randomUUID();
      if (m.lc_kwargs) {
        m.lc_kwargs.id = m.id;
      }
    }
    return m;
  });
}

const SpecialistState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  request: Annotation<string>({
    reducer: (prev, newValue) => newValue ?? prev,
    default: () => "",
  }),
  context: Annotation<Record<string, unknown>>({
    reducer: (prev, newValue) => newValue ?? prev,
    default: () => ({}),
  }),
  output: Annotation<string>({
    reducer: (prev, newValue) => newValue ?? prev,
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
    let promptConfig: PromptConfig = {
      model: "anthropic/claude-opus-4.5",
      temperature: 0,
    };

    // Track if we need to persist the prompt messages (including SystemMessage)
    let promptMessagesToPersist: BaseMessage[] = [];

    const isFirstInvocation = compressedMessages.length === 0;

    if (isFirstInvocation) {
      const { messages: promptMessages, config } = await compilePrompt(prompt, {
        request: state.request,
        ...state.context,
      });
      messages = promptMessages;
      promptConfig = config;
      // Store the prompt messages to persist them in state (including SystemMessage)
      promptMessagesToPersist = promptMessages;
    }

    const model = createModel(promptConfig);

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = (await model.invoke(messages)) as AIMessage;

        // On first invocation, persist the full prompt messages (including SystemMessage)
        // so they're available for subsequent invocations after tool calls.
        // Ensure all messages have stable IDs to prevent deduplication issues with messagesStateReducer.
        const messagesToReturn =
          promptMessagesToPersist.length > 0
            ? ensureMessageIds([...promptMessagesToPersist, response])
            : [response];

        if (!response.tool_calls || response.tool_calls.length === 0) {
          return {
            messages: messagesToReturn,
            output: response.text || "No response",
          };
        }

        return {
          messages: messagesToReturn,
        };
      } catch (error) {
        if (!isRetryableError(error) || attempt >= maxAttempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw new Error("Model invocation failed after retries");
  };
}

async function specialistToolsNode(
  state: SpecialistStateType,
): Promise<Partial<SpecialistStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];

  if (!AIMessage.isInstance(lastMessage)) {
    throw new Error("Expected AIMessage with tool_calls");
  }

  const toolCalls = lastMessage.tool_calls ?? [];

  const toolMessages = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const toolCallId = toolCall.id ?? "";
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        try {
          const args = toolCall.args as { code: string; isMutating: boolean };
          const result = await executeCodeTool.invoke(args);
          return new ToolMessage({
            content:
              typeof result === "string" ? result : JSON.stringify(result),
            tool_call_id: toolCallId,
          });
        } catch (error) {
          attempts++;
          if (!isRetryableError(error) || attempts >= maxAttempts) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(`executeCode failed:`, errorMessage);
            return new ToolMessage({
              content: `Code execution failed: ${errorMessage}`,
              tool_call_id: toolCallId,
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return new ToolMessage({
        content: "Tool execution failed after retries",
        tool_call_id: toolCallId,
      });
    }),
  );

  return {
    messages: toolMessages,
  };
}

function shouldContinue(state: SpecialistStateType): "tools" | typeof END {
  if (!state.messages || state.messages.length === 0) {
    return END;
  }

  const lastMessage = state.messages[state.messages.length - 1];

  if (AIMessage.isInstance(lastMessage)) {
    const toolCalls = lastMessage.tool_calls ?? [];
    if (toolCalls.length > 0) {
      return "tools";
    }
  }

  return END;
}

export function createSpecialist(config: SpecialistConfig) {
  const agentNode = createSpecialistAgentNode(config.promptDir);

  // Create a wrapper node that fetches context on first invocation
  const agentNodeWithContext = async (
    state: SpecialistStateType,
  ): Promise<Partial<SpecialistStateType>> => {
    // On first invocation (no messages yet), fetch context if getContext is provided
    const isFirstInvocation = state.messages.length === 0;
    if (isFirstInvocation && config.getContext) {
      const additionalContext = await config.getContext();
      // Merge additional context into state.context for the agent node
      const updatedState = {
        ...state,
        context: { ...state.context, ...additionalContext },
      };
      return agentNode(updatedState);
    }
    return agentNode(state);
  };

  const workflow = new StateGraph(SpecialistState)
    .addNode("agent", agentNodeWithContext)
    .addNode("tools", specialistToolsNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      [END]: END,
    })
    .addEdge("tools", "agent");

  return workflow.compile({
    checkpointer: config.checkpointer,
    recursionLimit: 50,
  });
}
