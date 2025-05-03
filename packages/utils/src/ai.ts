import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { customProvider, type TextStreamPart, type ToolSet } from "ai";

import { commands as connectorCommands } from "@hypr/plugin-connector";
import { fetch as customFetch } from "@hypr/utils";

export { generateText, type Provider, smoothStream, streamText } from "ai";

import { useChat as useChat$1 } from "@ai-sdk/react";

export const useChat = (options: Parameters<typeof useChat$1>[0]) => {
  return useChat$1({
    fetch: customFetch,
    ...options,
  });
};

const getModel = async ({ onboarding }: { onboarding: boolean }) => {
  const { type, connection: { api_base, api_key } } = await connectorCommands.getLlmConnection();

  const openai = createOpenAICompatible({
    name: "hypr-llm",
    baseURL: api_base,
    apiKey: api_key ?? "SOMETHING_NON_EMPTY",
    fetch: customFetch,
    headers: {
      "Origin": "http://localhost:1420",
    },
  });

  const customModel = await connectorCommands.getCustomLlmModel();
  const model = onboarding
    ? "mock-onboarding"
    : (type === "Custom" && customModel)
    ? customModel
    : "gpt-4";

  return openai(model);
};

export const modelProvider = async () => {
  const defaultModel = await getModel({ onboarding: false });
  const onboardingModel = await getModel({ onboarding: true });

  return customProvider({
    languageModels: { defaultModel, onboardingModel },
  });
};

type TransformState = {
  buffer: string;
  seenMdPrefix: boolean;
  finalized: boolean;
};

export const markdownTransform = <TOOLS extends ToolSet>() => (_options: { tools: TOOLS; stopStream: () => void }) => {
  const MARKDOWN_PREFIXES = {
    md: "```md",
    markdown: "```markdown",
  };

  const maxPrefixLength = Math.max(...Object.values(MARKDOWN_PREFIXES).map(p => p.length));

  return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
    start(_controller) {
      const state = this as unknown as TransformState;
      state.buffer = "";
      state.seenMdPrefix = false;
      state.finalized = false;
    },

    transform(chunk, controller) {
      const state = this as unknown as TransformState;

      if (chunk.type !== "text-delta") {
        controller.enqueue(chunk);
        return;
      }

      if (state.finalized) {
        controller.enqueue(chunk);
        return;
      }

      state.buffer += chunk.textDelta;

      let matchedPrefix = "";

      for (const prefix of Object.values(MARKDOWN_PREFIXES)) {
        if (state.buffer.startsWith(prefix)) {
          matchedPrefix = prefix;
          break;
        }
      }

      if (matchedPrefix) {
        state.seenMdPrefix = true;
        state.finalized = true;

        const newContent = state.buffer.slice(matchedPrefix.length);
        if (newContent) {
          controller.enqueue({
            ...chunk,
            textDelta: newContent,
          });
        }

        state.buffer = "";
        return;
      }

      if (state.buffer.length >= maxPrefixLength) {
        state.finalized = true;

        controller.enqueue({
          type: "text-delta",
          textDelta: state.buffer,
        } as TextStreamPart<TOOLS>);

        state.buffer = "";
      }
    },

    flush(controller) {
      const state = this as unknown as TransformState;

      if (state.buffer) {
        controller.enqueue({
          type: "text-delta",
          textDelta: state.buffer,
        } as TextStreamPart<TOOLS>);
      }
    },
  });
};
