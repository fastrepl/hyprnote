import { createStore } from "zustand";

type State = {};

type Actions = {
  set: (state: State) => void;
  get: () => State;
};

const initialState: State = {};

export type OngoingSessionStore2 = ReturnType<typeof createOngoingSessionStore2>;

export const createOngoingSessionStore2 = () => {
  return createStore<State & Actions>((set, get) => ({
    ...initialState,
    set,
    get,
  }));
};
