import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

import type { ImageContent } from "./utils/input";

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  request: Annotation<string>({
    reducer: (_, newValue) => newValue ?? "",
    default: () => "",
  }),

  images: Annotation<ImageContent[]>({
    reducer: (_, newValue) => newValue ?? [],
    default: () => [],
  }),

  output: Annotation<string>({
    reducer: (_, newValue) => newValue ?? "",
    default: () => "",
  }),
});

export type AgentStateType = typeof AgentState.State;
