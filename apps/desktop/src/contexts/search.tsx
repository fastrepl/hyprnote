import { createContext, useContext, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { CommandPalette } from "@/components/command-palette";
import { createSearchStore, SearchStore } from "@/stores/search";
import { useHypr } from "./hypr";

const SearchContext = createContext<ReturnType<typeof createSearchStore> | null>(null);

export function SearchProvider({
  children,
  store,
}: {
  children: React.ReactNode;
  store?: SearchStore;
}) {
  const { userId } = useHypr();

  const storeRef = useRef<ReturnType<typeof createSearchStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = store || createSearchStore(userId);
  }

  const searchInputRef = useRef<HTMLInputElement>(null);

  if (storeRef.current && searchInputRef.current !== storeRef.current.getState().searchInputRef?.current) {
    storeRef.current.getState().setSearchInputRef(searchInputRef);
  }

  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useHotkeys(
    "mod+k",
    (event) => {
      event.preventDefault();
      setShowCommandPalette(true);
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

  useHotkeys(
    "down",
    (event) => {
      const store = storeRef.current!;
      const state = store.getState();
      if (document.activeElement === state.searchInputRef?.current && state.matches.length > 0) {
        event.preventDefault();
        state.navigateResults("down");
      }
    },
    {
      enableOnFormTags: true,
    },
  );

  useHotkeys(
    "up",
    (event) => {
      const store = storeRef.current!;
      const state = store.getState();
      if (document.activeElement === state.searchInputRef?.current && state.matches.length > 0) {
        event.preventDefault();
        state.navigateResults("up");
      }
    },
    {
      enableOnFormTags: true,
    },
  );

  useHotkeys(
    "enter",
    (event) => {
      const store = storeRef.current!;
      const state = store.getState();
      if (document.activeElement === state.searchInputRef?.current && state.selectedIndex >= 0) {
        event.preventDefault();
        state.selectResult();
      }
    },
    {
      enableOnFormTags: true,
    },
  );

  return (
    <SearchContext.Provider value={storeRef.current}>
      {children}
      <CommandPalette open={showCommandPalette} onOpenChange={setShowCommandPalette} />
    </SearchContext.Provider>
  );
}

export function useHyprSearch<T>(
  selector: Parameters<typeof useStore<ReturnType<typeof createSearchStore>, T>>[1],
) {
  const store = useContext(SearchContext);

  if (!store) {
    throw new Error("'useHyprSearch' must be used within a 'SearchProvider'");
  }

  return useStore(store, useShallow(selector));
}
