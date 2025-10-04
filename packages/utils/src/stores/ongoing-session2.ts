import { createStore } from "zustand";

type State = {};

type Actions = {};

const initialState: State = {};

export type OngoingSessionStore2 = ReturnType<typeof createOngoingSessionStore2>;

export const createOngoingSessionStore2 = () => {
  return createStore<State & Actions>((set, get) => ({
    ...initialState,
    get: () => get(),
  }));
};
