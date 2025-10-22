import { createStore } from "zustand";

import { createGeneralSlice, type GeneralActions, type GeneralState } from "./general";
import { createTranscriptSlice, type TranscriptActions, type TranscriptState } from "./transcript";

type State = GeneralState & TranscriptState;
type Actions = GeneralActions & TranscriptActions;
type Store = State & Actions;

export type ListenerStore = ReturnType<typeof createListenerStore>;

export const createListenerStore = () => {
  return createStore<Store>((set, get) => ({
    ...createGeneralSlice(set, get),
    ...createTranscriptSlice(set, get),
  }));
};
