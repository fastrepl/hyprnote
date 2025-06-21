import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { customProvider, extractReasoningMiddleware, type TextStreamPart, type ToolSet, wrapLanguageModel } from "ai";

import { commands as connectorCommands } from "@hypr/plugin-connector";
import { fetch as customFetch } from "@hypr/utils";

export { generateObject, generateText, type Provider, smoothStream, streamText } from "ai";

import { useChat as useChat$1 } from "@ai-sdk/react";

export const useChat = (options: Parameters<typeof useChat$1>[0]) => {
  return useChat$1({
    fetch: customFetch,
    ...options,
  });
};

export const providerName = "hypr-llm";

const reasoningMiddleware = extractReasoningMiddleware({
  tagName: "thinking",
  separator: "\n",
  startWithReasoning: false,
});

const getModel = async ({ onboarding }: { onboarding: boolean }) => {
  const getter = onboarding ? connectorCommands.getLocalLlmConnection : connectorCommands.getLlmConnection;
  const { type, connection: { api_base, api_key } } = await getter();

  const openai = createOpenAICompatible({
    name: providerName,
    baseURL: api_base,
    apiKey: api_key ?? "SOMETHING_NON_EMPTY",
    fetch: customFetch,
    headers: {
      "Origin": "http://localhost:1420",
    },
  });

  const customModel = await connectorCommands.getCustomLlmModel();
  const id = onboarding
    ? "mock-onboarding"
    : (type === "Custom" && customModel)
    ? customModel
    : "gpt-4";

  const model = openai(id);
  return wrapLanguageModel({ model, middleware: [reasoningMiddleware] });
};

export const modelProvider = async () => {
  const defaultModel = await getModel({ onboarding: false });
  const onboardingModel = await getModel({ onboarding: true });

  return customProvider({
    languageModels: { defaultModel, onboardingModel },
  });
};

type TransformState = {
  unprocessedText: string;
  isCurrentlyInCodeBlock: boolean;
};

export const markdownTransform = <TOOLS extends ToolSet>() => (_options: { tools: TOOLS; stopStream: () => void }) => {
  const CODE_FENCE_MARKER = "```";

  const extractAndProcessLines = (
    state: TransformState,
    controller: TransformStreamDefaultController<TextStreamPart<TOOLS>>,
    processRemainingContent: boolean = false,
  ) => {
    let textToOutput = "";

    while (true) {
      const nextLineBreakPosition = state.unprocessedText.indexOf("\n");
      const hasCompleteLineToProcess = nextLineBreakPosition !== -1;

      if (!hasCompleteLineToProcess) {
        if (!processRemainingContent) {
          break;
        }

        const remainingText = state.unprocessedText;
        if (remainingText.length > 0) {
          state.unprocessedText = "";

          const isCodeFence = remainingText.startsWith(CODE_FENCE_MARKER);
          if (!isCodeFence) {
            textToOutput += remainingText;
          }
        }
        break;
      }

      const currentLineContent = state.unprocessedText.substring(0, nextLineBreakPosition);
      const textAfterCurrentLine = state.unprocessedText.substring(nextLineBreakPosition + 1);

      const isCodeFenceLine = currentLineContent.startsWith(CODE_FENCE_MARKER);

      if (isCodeFenceLine) {
        state.isCurrentlyInCodeBlock = !state.isCurrentlyInCodeBlock;
        state.unprocessedText = textAfterCurrentLine;
        continue;
      }

      const currentLineWithLineBreak = currentLineContent + "\n";
      textToOutput += currentLineWithLineBreak;
      state.unprocessedText = textAfterCurrentLine;
    }

    if (textToOutput.length > 0) {
      controller.enqueue({
        type: "text-delta",
        textDelta: textToOutput,
      } as TextStreamPart<TOOLS>);
    }
  };

  return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
    start(_controller) {
      const state = this as unknown as TransformState;
      state.unprocessedText = "";
      state.isCurrentlyInCodeBlock = false;
    },

    transform(chunk, controller) {
      const state = this as unknown as TransformState;

      const isNonTextChunk = chunk.type !== "text-delta";
      if (isNonTextChunk) {
        extractAndProcessLines(state, controller, true);
        controller.enqueue(chunk);
        return;
      }

      state.unprocessedText += chunk.textDelta;
      extractAndProcessLines(state, controller, false);
    },

    flush(controller) {
      const state = this as unknown as TransformState;
      extractAndProcessLines(state, controller, true);
    },
  });
};
