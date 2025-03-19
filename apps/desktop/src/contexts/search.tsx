import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

interface SearchContextType {
  searchQuery: string;
  searchInputRef: React.RefObject<HTMLInputElement>;
  focusSearch: () => void;
  clearSearch: () => void;
  setSearchQuery: (query: string) => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => {
    // Focus the input after a small delay to ensure the DOM has updated
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.blur();
  }, []);

  // Set up keyboard shortcut (Cmd+K or Ctrl+K) to focus search
  useHotkeys(
    "mod+k",
    (event) => {
      event.preventDefault();
      if (document.activeElement === searchInputRef.current) {
        clearSearch();
      } else {
        focusSearch();
      }
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  // Set up Escape key to clear search
  useHotkeys(
    "escape",
    (event) => {
      if (document.activeElement === searchInputRef.current || searchQuery) {
        event.preventDefault();
        clearSearch();
      }
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        searchInputRef,
        focusSearch,
        clearSearch,
        setSearchQuery,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}
