import { createStore } from "zustand";

type State = {
  query: string;
  matches: string[];
};

type Actions = {
  setQuery: (query: string) => void;
  setMatches: (matches: string[]) => void;
  clearSearch: () => void;
  focusSearch: () => void;
  searchInputRef: React.RefObject<HTMLInputElement> | null;
  setSearchInputRef: (ref: React.RefObject<HTMLInputElement>) => void;
};

export type SearchStore = ReturnType<typeof createSearchStore>;

export const createSearchStore = () => {
  return createStore<State & Actions>((set, get) => ({
    query: "",
    matches: [],
    searchInputRef: null,
    setQuery: (query: string) => set({ query }),
    setMatches: (matches: string[]) => set({ matches }),
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
