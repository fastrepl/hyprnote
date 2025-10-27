import { createStore } from "zustand";

import type { ToolRegistry } from "../../../contexts/tool-registry/core";
import { createTasksSlice, type TasksActions, type TasksState } from "./tasks";

type State = TasksState;
type Actions = TasksActions;
type Store = State & Actions;

export type AITaskStore = ReturnType<typeof createAITaskStore>;

export const createAITaskStore = ({ toolRegistry }: { toolRegistry: ToolRegistry }) => {
  return createStore<Store>((set, get) => ({
    ...createTasksSlice(set, get, { toolRegistry }),
  }));
};
