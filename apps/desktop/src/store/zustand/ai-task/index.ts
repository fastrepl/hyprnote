import { createStore } from "zustand";

import type { Store as PersistedStore } from "../../tinybase/main";
import type { Store as SettingsStore } from "../../tinybase/settings";
import { createTasksSlice, type TasksActions, type TasksState } from "./tasks";

type State = TasksState;
type Actions = TasksActions;
type Store = State & Actions;

export type AITaskStore = ReturnType<typeof createAITaskStore>;

export const createAITaskStore = ({
  persistedStore,
  settingsStore,
}: {
  persistedStore: PersistedStore;
  settingsStore: SettingsStore;
}) => {
  return createStore<Store>((set, get) => ({
    ...createTasksSlice(set, get, { persistedStore, settingsStore }),
  }));
};
