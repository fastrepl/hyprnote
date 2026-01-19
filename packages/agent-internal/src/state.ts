import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

import type { ImageContent } from "./utils/input";

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  request: Annotation<string>({
    reducer: (prev, newValue) => newValue ?? prev,
    default: () => "",
  }),

  images: Annotation<ImageContent[]>({
    reducer: (prev, newValue) => newValue ?? prev,
    default: () => [],
  }),

  output: Annotation<string>({
    reducer: (prev, newValue) => newValue ?? prev,
    default: () => "",
  }),
});

export type AgentStateType = typeof AgentState.State;
