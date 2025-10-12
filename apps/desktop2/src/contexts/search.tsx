import { create, insert, Orama, search as oramaSearch } from "@orama/orama";
import { pluginQPS } from "@orama/plugin-qps";
import { useRouteContext } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type SearchEntityType = "session" | "human" | "organization";

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
}

export interface SearchGroup {
  key: string;
  type: SearchEntityType;
  title: string;
  results: SearchResult[];
  totalCount: number;
  topScore: number;
  visibleCount: number;
  hasMore: boolean;
}

export interface GroupedSearchResults {
  groups: SearchGroup[];
  totalResults: number;
  maxScore: number;
}

interface SearchContextValue {
  query: string;
  setQuery: (query: string) => void;
  results: GroupedSearchResults | null;
  isSearching: boolean;
  isFocused: boolean;
  isIndexing: boolean;
  onFocus: () => void;
  onBlur: () => void;
  loadMoreInGroup: (groupKey: string) => void;
}

function flattenTranscript(transcript: any): string {
  if (!transcript) {
    return "";
  }

  try {
    const parsed = typeof transcript === "string" ? JSON.parse(transcript) : transcript;

    if (Array.isArray(parsed)) {
      return parsed.map((segment: any) => segment.text || segment.content || "").join(" ");
    }

    if (typeof parsed === "object") {
      return Object.values(parsed)
        .map((val) => {
          if (typeof val === "string") {
            return val;
          }
          if (typeof val === "object" && val) {
            return flattenTranscript(val);
          }
          return "";
        })
        .join(" ");
    }

    return String(parsed);
  } catch {
    return String(transcript);
  }
}

function createSessionSearchableContent(row: any): string {
  const parts = [
    row.raw_md || "",
    row.enhanced_md || "",
    flattenTranscript(row.transcript),
  ];
  return parts.filter(Boolean).join(" ");
}

function createHumanSearchableContent(row: any): string {
  return [row.email || "", row.job_title || "", row.linkedin_username || ""]
    .filter(Boolean)
    .join(" ");
}

function indexSessions(db: Orama<any>, persistedStore: any): void {
  persistedStore.forEachRow("sessions", (rowId: string) => {
    const row = {
      user_id: persistedStore.getCell("sessions", rowId, "user_id"),
      created_at: persistedStore.getCell("sessions", rowId, "created_at"),
      folder_id: persistedStore.getCell("sessions", rowId, "folder_id"),
      event_id: persistedStore.getCell("sessions", rowId, "event_id"),
      title: persistedStore.getCell("sessions", rowId, "title"),
      raw_md: persistedStore.getCell("sessions", rowId, "raw_md"),
      enhanced_md: persistedStore.getCell("sessions", rowId, "enhanced_md"),
      transcript: persistedStore.getCell("sessions", rowId, "transcript"),
    };

    void insert(db, {
      id: rowId,
      type: "session",
      title: (row.title as string) || "Untitled",
      content: createSessionSearchableContent(row),
      metadata: JSON.stringify({
        created_at: row.created_at,
        folder_id: row.folder_id,
        event_id: row.event_id,
      }),
    });
  });
}

function indexHumans(db: Orama<any>, persistedStore: any): void {
  persistedStore.forEachRow("humans", (rowId: string) => {
    const row = {
      name: persistedStore.getCell("humans", rowId, "name"),
      email: persistedStore.getCell("humans", rowId, "email"),
      org_id: persistedStore.getCell("humans", rowId, "org_id"),
      job_title: persistedStore.getCell("humans", rowId, "job_title"),
      linkedin_username: persistedStore.getCell("humans", rowId, "linkedin_username"),
      is_user: persistedStore.getCell("humans", rowId, "is_user"),
      created_at: persistedStore.getCell("humans", rowId, "created_at"),
    };

    void insert(db, {
      id: rowId,
      type: "human",
      title: (row.name as string) || "Unknown",
      content: createHumanSearchableContent(row),
      metadata: JSON.stringify({
        email: row.email,
        org_id: row.org_id,
        job_title: row.job_title,
        is_user: row.is_user,
      }),
    });
  });
}

function indexOrganizations(db: Orama<any>, persistedStore: any): void {
  persistedStore.forEachRow("organizations", (rowId: string) => {
    const row = {
      name: persistedStore.getCell("organizations", rowId, "name"),
      created_at: persistedStore.getCell("organizations", rowId, "created_at"),
    };

    void insert(db, {
      id: rowId,
      type: "organization",
      title: (row.name as string) || "Unknown Organization",
      content: "",
      metadata: JSON.stringify({
        created_at: row.created_at,
      }),
    });
  });
}

const ITEMS_PER_PAGE = 3;
const SCORE_PERCENTILE_THRESHOLD = 0.1; // Keep top 90% of results

function calculateDynamicThreshold(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }

  const sortedScores = [...scores].sort((a, b) => b - a);
  const thresholdIndex = Math.floor(sortedScores.length * SCORE_PERCENTILE_THRESHOLD);

  return sortedScores[Math.min(thresholdIndex, sortedScores.length - 1)] || 0;
}

function groupSearchResults(hits: any[], visibleCounts: Map<string, number>): GroupedSearchResults {
  if (hits.length === 0) {
    return {
      groups: [],
      totalResults: 0,
      maxScore: 0,
    };
  }

  // Calculate dynamic threshold
  const allScores = hits.map((hit) => hit.score);
  const maxScore = Math.max(...allScores);
  const threshold = calculateDynamicThreshold(allScores);

  // Filter hits by threshold and group by type
  const filteredHits = hits.filter((hit) => hit.score >= threshold);
  const groupedByType = new Map<SearchEntityType, SearchResult[]>();

  filteredHits.forEach((hit) => {
    const doc = hit.document as {
      id: string;
      type: SearchEntityType;
      title: string;
      content: string;
      metadata: string;
    };

    const result: SearchResult = {
      id: doc.id,
      type: doc.type,
      title: doc.title,
      content: doc.content,
      metadata: JSON.parse(doc.metadata),
      score: hit.score,
    };

    const existing = groupedByType.get(doc.type) || [];
    existing.push(result);
    groupedByType.set(doc.type, existing);
  });

  // Sort results within each group by score
  groupedByType.forEach((results) => {
    results.sort((a, b) => b.score - a.score);
  });

  // Create group metadata with pagination
  const groupMetadata: SearchGroup[] = [];

  const typeLabels: Record<SearchEntityType, string> = {
    session: "Sessions",
    human: "People",
    organization: "Organizations",
  };

  groupedByType.forEach((results, type) => {
    const groupKey = type;
    const visibleCount = visibleCounts.get(groupKey) || ITEMS_PER_PAGE;
    const topScore = results[0]?.score || 0;

    groupMetadata.push({
      key: groupKey,
      type,
      title: typeLabels[type],
      results,
      totalCount: results.length,
      topScore,
      visibleCount,
      hasMore: results.length > visibleCount,
    });
  });

  groupMetadata.sort((a, b) => b.topScore - a.topScore);

  return {
    groups: groupMetadata,
    totalResults: filteredHits.length,
    maxScore,
  };
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const { persistedStore } = useRouteContext({ from: "__root__" });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [visibleCounts, setVisibleCounts] = useState<Map<string, number>>(new Map());

  const oramaInstance = useRef<Orama<any> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchHits = useRef<any[]>([]);

  const createIndex = useCallback(async () => {
    if (!persistedStore || isIndexing) {
      return;
    }

    setIsIndexing(true);

    try {
      const db = await create({
        schema: {
          id: "string",
          type: "enum",
          title: "string",
          content: "string",
          metadata: "string",
        } as const,
        plugins: [pluginQPS()],
      });

      indexSessions(db, persistedStore);
      indexHumans(db, persistedStore);
      indexOrganizations(db, persistedStore);

      oramaInstance.current = db;
    } catch (error) {
      console.error("Failed to create search index:", error);
    } finally {
      setIsIndexing(false);
    }
  }, [persistedStore, isIndexing]);

  const performSearch = useCallback(async (searchQuery: string) => {
    // Preflight: normalize and validate query
    const normalizedQuery = searchQuery.trim().replace(/\s+/g, " ");

    if (!oramaInstance.current || !normalizedQuery || normalizedQuery.length < 2) {
      setResults(null);
      setIsSearching(false);
      lastSearchHits.current = [];
      return;
    }

    setIsSearching(true);

    try {
      const searchResults = await oramaSearch(oramaInstance.current, {
        term: normalizedQuery,
        boost: {
          title: 3,
          content: 1,
        },
        limit: 100,
        tolerance: 1,
      });

      lastSearchHits.current = searchResults.hits;
      const grouped = groupSearchResults(searchResults.hits, visibleCounts);
      setResults(grouped);
    } catch (error) {
      console.error("Search failed:", error);
      setResults(null);
      lastSearchHits.current = [];
    } finally {
      setIsSearching(false);
    }
  }, [visibleCounts]);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim()) {
      debounceTimer.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults(null);
      setIsSearching(false);
      setVisibleCounts(new Map());
      lastSearchHits.current = [];
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, performSearch]);

  const onFocus = useCallback(() => {
    setIsFocused(true);
    if (!oramaInstance.current) {
      createIndex();
    }
  }, [createIndex]);

  const onBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const loadMoreInGroup = useCallback((groupKey: string) => {
    setVisibleCounts((prev) => {
      const newCounts = new Map(prev);
      const currentCount = newCounts.get(groupKey) || ITEMS_PER_PAGE;
      newCounts.set(groupKey, currentCount + 5);

      // Re-group existing search results with new visible counts
      if (lastSearchHits.current.length > 0) {
        const grouped = groupSearchResults(lastSearchHits.current, newCounts);
        setResults(grouped);
      }

      return newCounts;
    });
  }, []);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      results,
      isSearching,
      isFocused,
      isIndexing,
      onFocus,
      onBlur,
      loadMoreInGroup,
    }),
    [query, results, isSearching, isFocused, isIndexing, onFocus, onBlur, loadMoreInGroup],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}
