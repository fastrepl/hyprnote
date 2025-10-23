import { Highlight } from "@orama/highlight";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useHotkeys } from "react-hotkeys-hook";
import type { SearchDocument, SearchEntityType, SearchFilters, SearchHit } from "./engine";
import { useSearchEngine } from "./engine";

export type { SearchEntityType, SearchFilters } from "./engine";

export type SearchResult = SearchDocument & {
  titleHighlighted: string;
  contentHighlighted: string;
  score: number;
};

export interface SearchGroup {
  key: string;
  type: SearchEntityType;
  title: string;
  results: SearchResult[];
  totalCount: number;
  topScore: number;
}

export interface GroupedSearchResults {
  groups: SearchGroup[];
  totalResults: number;
  maxScore: number;
}

interface SearchUIContextValue {
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFilters | null;
  setFilters: (filters: SearchFilters | null) => void;
  results: GroupedSearchResults | null;
  isSearching: boolean;
  isIndexing: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const SCORE_PERCENTILE_THRESHOLD = 0.1;

const GROUP_TITLES: Record<SearchEntityType, string> = {
  session: "Sessions",
  human: "People",
  organization: "Organizations",
};

function calculateDynamicThreshold(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }

  const sortedScores = [...scores].sort((a, b) => b - a);
  const thresholdIndex = Math.floor(sortedScores.length * SCORE_PERCENTILE_THRESHOLD);

  return sortedScores[Math.min(thresholdIndex, sortedScores.length - 1)] || 0;
}

function createSearchResult(hit: SearchHit, query: string): SearchResult {
  const highlighter = new Highlight();
  const titleHighlighted = highlighter.highlight(hit.document.title, query);
  const contentHighlighted = highlighter.highlight(hit.document.content, query);

  return {
    id: hit.document.id,
    type: hit.document.type,
    title: hit.document.title,
    titleHighlighted: titleHighlighted.HTML,
    content: hit.document.content,
    contentHighlighted: contentHighlighted.HTML,
    created_at: hit.document.created_at,
    score: hit.score,
  };
}

function sortResultsByScore(a: SearchResult, b: SearchResult): number {
  return b.score - a.score;
}

function toGroup(
  type: SearchEntityType,
  results: SearchResult[],
): SearchGroup {
  const topScore = results[0]?.score || 0;

  return {
    key: type,
    type,
    title: GROUP_TITLES[type],
    results,
    totalCount: results.length,
    topScore,
  };
}

function groupSearchResults(
  hits: SearchHit[],
  query: string,
): GroupedSearchResults {
  if (hits.length === 0) {
    return {
      groups: [],
      totalResults: 0,
      maxScore: 0,
    };
  }

  const scores = hits.map((hit) => hit.score);
  const maxScore = Math.max(...scores);
  const threshold = calculateDynamicThreshold(scores);

  const grouped = hits.reduce<Map<SearchEntityType, SearchResult[]>>((acc, hit) => {
    if (hit.score < threshold) {
      return acc;
    }

    const key = hit.document.type;
    const list = acc.get(key) ?? [];
    list.push(createSearchResult(hit, query));
    acc.set(key, list);
    return acc;
  }, new Map());

  const groups = Array.from(grouped.entries())
    .map(([type, results]) => toGroup(type, results.sort(sortResultsByScore)))
    .sort((a, b) => b.topScore - a.topScore);

  const totalResults = groups.reduce((count, group) => count + group.totalCount, 0);

  return {
    groups,
    totalResults,
    maxScore,
  };
}

const SearchUIContext = createContext<SearchUIContextValue | null>(null);

export function SearchUIProvider({ children }: { children: React.ReactNode }) {
  const { search, isIndexing } = useSearchEngine();

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useHotkeys(
    "mod+k",
    () => inputRef.current?.focus(),
    { preventDefault: true, enableOnFormTags: true, enableOnContentEditable: true },
  );

  const resetSearchState = useCallback(() => {
    setSearchHits([]);
    setSearchQuery("");
  }, []);

  const performSearch = useCallback(
    async (searchQueryInput: string, searchFilters: SearchFilters | null) => {
      if (searchQueryInput.trim().length < 1) {
        resetSearchState();
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const hits = await search(searchQueryInput, searchFilters);
        setSearchHits(hits);
        setSearchQuery(searchQueryInput.trim());
      } catch (error) {
        console.error("Search failed:", error);
        resetSearchState();
      } finally {
        setIsSearching(false);
      }
    },
    [search, resetSearchState],
  );

  useEffect(() => {
    if (query.trim().length < 1) {
      resetSearchState();
      setIsSearching(false);
    } else {
      void performSearch(query, filters);
    }
  }, [query, filters, performSearch, resetSearchState]);

  const results = useMemo(() => {
    if (searchHits.length === 0 || !searchQuery) {
      return null;
    }
    return groupSearchResults(searchHits, searchQuery);
  }, [searchHits, searchQuery]);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      filters,
      setFilters,
      results,
      isSearching,
      isIndexing,
      inputRef,
    }),
    [query, filters, results, isSearching, isIndexing],
  );

  return <SearchUIContext.Provider value={value}>{children}</SearchUIContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchUIContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchUIProvider");
  }
  return context;
}
