import { commands as dbCommands, type Event, type Human, type Organization, type Session } from "@hypr/plugin-db";
import { createStore } from "zustand";

export type SearchMatch = {
  type: "session";
  item: Session;
} | {
  type: "event";
  item: Event;
} | {
  type: "human";
  item: Human;
} | {
  type: "organization";
  item: Organization;
};

type State = {
  query: string;
  matches: SearchMatch[];
};

type Actions = {
  setQuery: (query: string) => void;
  clearSearch: () => void;
  focusSearch: () => void;
  searchInputRef: React.RefObject<HTMLInputElement> | null;
  setSearchInputRef: (ref: React.RefObject<HTMLInputElement>) => void;
};

export type SearchStore = ReturnType<typeof createSearchStore>;

export const createSearchStore = (userId: string) => {
  return createStore<State & Actions>((set, get) => ({
    query: "",
    matches: [],
    searchInputRef: null,
    setQuery: async (query: string) => {
      const sessions = await dbCommands.listSessions({ pagination: { limit: 3, offset: 0 } });
      const matches: SearchMatch[] = sessions.map((session) => ({
        type: "session",
        item: session,
      }));

      set({ query, matches });
    },
    clearSearch: () => {
      set({ query: "" });
      get().searchInputRef?.current?.blur();
    },
    focusSearch: () => {
      setTimeout(() => {
        get().searchInputRef?.current?.focus();
      }, 10);
    },
    setSearchInputRef: (ref: React.RefObject<HTMLInputElement>) => set({ searchInputRef: ref }),
  }));
};
