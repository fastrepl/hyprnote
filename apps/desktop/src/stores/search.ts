import {
  commands as dbCommands,
  type Event,
  type Human,
  type Organization,
  type Session,
  type Tag,
} from "@hypr/plugin-db";
import { debounce } from "lodash-es";
import type React from "react";
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
  previous?: URL;
  query: string;
  selectedTags: Tag[];
  matches: SearchMatch[];
  searchInputRef: React.RefObject<HTMLInputElement> | null;
  isSearching: boolean;
  selectedIndex: number;
  searchHistory: string[];
};

type Actions = {
  setQuery: (query: string) => void;
  clearSearch: () => void;
  focusSearch: () => void;
  setSearchInputRef: (ref: React.RefObject<HTMLInputElement>) => void;
  navigateResults: (direction: "up" | "down") => void;
  selectResult: () => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  addTagFilter: (tag: Tag) => void;
  removeTagFilter: (tagId: string) => void;
  clearTagFilters: () => void;
};

export type SearchStore = ReturnType<typeof createSearchStore>;

const getStoredSearchHistory = (userId: string): string[] => {
  try {
    const stored = localStorage.getItem(`search-history-${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveSearchHistory = (userId: string, history: string[]) => {
  try {
    localStorage.setItem(`search-history-${userId}`, JSON.stringify(history));
  } catch {
    // Silently fail if localStorage is not available
  }
};

export const createSearchStore = (userId: string) => {
  const performSearch = debounce(async (query: string, setState: any, getState: any) => {
    setState({ isSearching: true });

    try {
      if (query.trim() === "") {
        setState({ matches: [], isSearching: false });
        handleEmpty(getState);
        return;
      }

      // Determine search strategy based on selected tags
      const { selectedTags } = getState();
      const hasTagFilter = selectedTags.length > 0;

      // Fast, simple API calls
      const [sessions, events, humans, organizations] = await Promise.all([
        // Use tag filter if tags selected, otherwise text search
        hasTagFilter
          ? dbCommands.listSessions({
            type: "tagFilter",
            tag_ids: selectedTags.map((t: Tag) => t.id),
            limit: 10,
            user_id: userId,
          })
          : dbCommands.listSessions({ type: "search", query, limit: 10, user_id: userId }),
        dbCommands.listEvents({ type: "search", query, limit: 5, user_id: userId }),
        dbCommands.listHumans({ search: [3, query] }),
        dbCommands.listOrganizations({ search: [3, query] }),
      ]);

      // Check if query is still current
      if (query !== getState().query) {
        return;
      }

      // Simple mapping
      const matches: SearchMatch[] = [
        ...sessions.map((session) => ({
          type: "session" as const,
          item: session,
        })),
        ...events.map((event) => ({
          type: "event" as const,
          item: event,
        })),
        ...humans.map((human) => ({
          type: "human" as const,
          item: human,
        })),
        ...organizations.map((organization) => ({
          type: "organization" as const,
          item: organization,
        })),
      ];

      const url = new URL(window.location.href);
      if (url.pathname.includes("note")) {
        setState({ previous: url });
      }

      setState({ matches, isSearching: false });
    } catch (error) {
      console.error("Search error:", error);
      setState({ isSearching: false });
    }
  }, 200);

  return createStore<State & Actions>((set, get) => ({
    query: "",
    selectedTags: [],
    matches: [],
    searchInputRef: null,
    isSearching: false,
    selectedIndex: -1,
    searchHistory: getStoredSearchHistory(userId),
    setQuery: (query: string) => {
      // Update query immediately for responsive typing
      set({ query, selectedIndex: -1 });

      // Debounce the actual search
      performSearch(query, set, get);
    },
    clearSearch: () => {
      const { searchInputRef } = get();
      searchInputRef?.current?.blur();

      handleEmpty(get);
      set({ query: "", matches: [], selectedIndex: -1, selectedTags: [] });
    },
    focusSearch: () => {
      setTimeout(() => {
        get().searchInputRef?.current?.focus();
      }, 10);
    },
    setSearchInputRef: (ref: React.RefObject<HTMLInputElement>) => set({ searchInputRef: ref }),
    navigateResults: (direction: "up" | "down") => {
      const { matches, selectedIndex } = get();
      if (matches.length === 0) {
        return;
      }

      let newIndex = selectedIndex;
      if (direction === "down") {
        newIndex = selectedIndex < matches.length - 1 ? selectedIndex + 1 : 0;
      } else {
        newIndex = selectedIndex > 0 ? selectedIndex - 1 : matches.length - 1;
      }

      set({ selectedIndex: newIndex });
    },
    selectResult: () => {
      const { matches, selectedIndex } = get();
      if (selectedIndex >= 0 && selectedIndex < matches.length) {
        const match = matches[selectedIndex];
        const query = get().query;

        if (query.trim()) {
          get().addToSearchHistory(query);
        }

        navigateToMatch(match);
        get().clearSearch();
      }
    },
    addToSearchHistory: (query: string) => {
      const { searchHistory } = get();
      const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10);
      set({ searchHistory: newHistory });
      saveSearchHistory(userId, newHistory);
    },
    clearSearchHistory: () => {
      set({ searchHistory: [] });
      saveSearchHistory(userId, []);
    },
    addTagFilter: (tag: Tag) => {
      const { selectedTags } = get();
      if (!selectedTags.find((t) => t.id === tag.id)) {
        const newTags = [...selectedTags, tag];
        set({ selectedTags: newTags, selectedIndex: -1 });
        // Trigger search with new tag filter
        performSearch(get().query, set, get);
      }
    },
    removeTagFilter: (tagId: string) => {
      const { selectedTags } = get();
      const newTags = selectedTags.filter((t) => t.id !== tagId);
      set({ selectedTags: newTags, selectedIndex: -1 });
      // Trigger search with updated tag filter
      performSearch(get().query, set, get);
    },
    clearTagFilters: () => {
      set({ selectedTags: [], selectedIndex: -1 });
      // Trigger search without tag filter
      performSearch(get().query, set, get);
    },
  }));
};

const handleEmpty = (get: () => State) => {
  const { previous } = get();
  if (previous) {
    window.history.pushState({}, "", previous.pathname);
  }
};

const navigateToMatch = (match: SearchMatch) => {
  switch (match.type) {
    case "session":
      window.location.href = `/app/note/${match.item.id}`;
      break;
    case "event":
      window.location.href = `/app/new?calendarEventId=${match.item.id}`;
      break;
    case "human":
      window.location.href = `/app/human/${match.item.id}`;
      break;
    case "organization":
      window.location.href = `/app/organization/${match.item.id}`;
      break;
  }
};
