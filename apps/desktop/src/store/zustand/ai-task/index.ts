import { createStore } from "zustand";

import type { ToolRegistry } from "../../../contexts/tool-registry/core";
import type { Store as PersistedStore } from "../../tinybase/persisted";
import { createTasksSlice, type TasksActions, type TasksState } from "./tasks";

type State = TasksState;
type Actions = TasksActions;
type Store = State & Actions;

export type AITaskStore = ReturnType<typeof createAITaskStore>;

export const createAITaskStore = ({
  toolRegistry,
  persistedStore,
}: {
  toolRegistry: ToolRegistry;
  persistedStore: PersistedStore;
}) => {
  return createStore<Store>((set, get) => ({
    ...createTasksSlice(set, get, { toolRegistry, persistedStore }),
  }));
};
