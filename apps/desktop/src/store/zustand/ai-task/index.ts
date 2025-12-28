import { createStore } from "zustand";

import type { Store as MainStore } from "../../tinybase/main";
import { createTasksSlice, type TasksActions, type TasksState } from "./tasks";

type State = TasksState;
type Actions = TasksActions;
type Store = State & Actions;

export type AITaskStore = ReturnType<typeof createAITaskStore>;

export const createAITaskStore = ({
  persistedStore,
}: {
  persistedStore: MainStore;
}) => {
  return createStore<Store>((set, get) => ({
    ...createTasksSlice(set, get, { persistedStore }),
  }));
};
