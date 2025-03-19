import { createContext, useContext, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { createSearchStore, SearchStore } from "@/stores/search";

const SearchContext = createContext<ReturnType<typeof createSearchStore> | null>(null);

export function SearchProvider({
  children,
  store,
}: {
  children: React.ReactNode;
  store?: SearchStore;
}) {
  const storeRef = useRef<ReturnType<typeof createSearchStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = store || createSearchStore();
  }

  const searchInputRef = useRef<HTMLInputElement>(null);

  if (storeRef.current && searchInputRef.current !== storeRef.current.getState().searchInputRef?.current) {
    storeRef.current.getState().setSearchInputRef(searchInputRef);
  }

  useHotkeys(
    "mod+k",
    (event) => {
      event.preventDefault();
      const store = storeRef.current!;
      const state = store.getState();
      if (document.activeElement === state.searchInputRef?.current) {
        state.clearSearch();
      } else {
        state.focusSearch();
      }
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  useHotkeys(
    "escape",
    (event) => {
      const store = storeRef.current!;
      const state = store.getState();
      if (document.activeElement === state.searchInputRef?.current || state.query) {
        event.preventDefault();
        state.clearSearch();
      }
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  return (
    <SearchContext.Provider value={storeRef.current}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch<T>(
  selector: Parameters<typeof useStore<ReturnType<typeof createSearchStore>, T>>[1],
) {
  const store = useContext(SearchContext);

  if (!store) {
    throw new Error("'useSearch' must be used within a 'SearchProvider'");
  }

  return useStore(store, useShallow(selector));
}
