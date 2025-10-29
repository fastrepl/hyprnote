import { type Store as InternalStore } from "../store/tinybase/internal";
import { type Store as PersistedStore } from "../store/tinybase/main";

import type { ToolRegistry } from "../contexts/tool-registry/core";
import type { AITaskStore } from "../store/zustand/ai-task";
import type { ListenerStore } from "../store/zustand/listener";

export type Context = {
  persistedStore: PersistedStore;
  internalStore: InternalStore;
  listenerStore: ListenerStore;
  aiTaskStore: AITaskStore;
  toolRegistry: ToolRegistry;
};
