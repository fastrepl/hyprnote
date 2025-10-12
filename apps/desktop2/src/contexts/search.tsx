import { Highlight } from "@orama/highlight";
import { create, insert, Orama, search as oramaSearch } from "@orama/orama";
import { pluginQPS } from "@orama/plugin-qps";
import { useRouteContext } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type SearchEntityType = "session" | "human" | "organization";

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  titleHighlighted: string;
  content: string;
  contentHighlighted: string;
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

interface SearchDocument {
  id: string;
  type: SearchEntityType;
  title: string;
  content: string;
  metadata: string;
}

interface SearchHit {
  score: number;
  document: SearchDocument;
}

type SerializableObject = Record<string, unknown>;

const ITEMS_PER_PAGE = 3;
const LOAD_MORE_STEP = 5;
const SCORE_PERCENTILE_THRESHOLD = 0.1;
const SPACE_REGEX = /\s+/g;

const GROUP_TITLES: Record<SearchEntityType, string> = {
  session: "Sessions",
  human: "People",
  organization: "Organizations",
};

function safeParseJSON(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeQuery(query: string): string {
  return query.trim().replace(SPACE_REGEX, " ");
}

function toTrimmedString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function mergeContent(parts: unknown[]): string {
  return parts
    .map(toTrimmedString)
    .filter(Boolean)
    .join(" ");
}

function parseMetadata(metadata: unknown): SerializableObject {
  if (typeof metadata !== "string" || metadata.length === 0) {
    return {};
  }

  const parsed = safeParseJSON(metadata);
  if (typeof parsed === "object" && parsed !== null) {
    return parsed as SerializableObject;
  }

  return {};
}

function flattenTranscript(transcript: unknown): string {
  if (transcript == null) {
    return "";
  }

  const parsed = safeParseJSON(transcript);

  if (typeof parsed === "string") {
    return parsed;
  }

  if (Array.isArray(parsed)) {
    return mergeContent(
      parsed.map((segment) => {
        if (!segment) {
          return "";
        }

        if (typeof segment === "string") {
          return segment;
        }

        if (typeof segment === "object") {
          const record = segment as Record<string, unknown>;
          const preferred = record.text ?? record.content;
          if (typeof preferred === "string") {
            return preferred;
          }

          return flattenTranscript(Object.values(record));
        }

        return "";
      }),
    );
  }

  if (typeof parsed === "object" && parsed !== null) {
    return mergeContent(Object.values(parsed).map((value) => flattenTranscript(value)));
  }

  return "";
}

function collectCells(
  persistedStore: any,
  table: string,
  rowId: string,
  fields: string[],
): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    acc[field] = persistedStore.getCell(table, rowId, field);
    return acc;
  }, {});
}

function createSessionSearchableContent(row: Record<string, unknown>): string {
  return mergeContent([
    row.raw_md,
    row.enhanced_md,
    flattenTranscript(row.transcript),
  ]);
}

function createHumanSearchableContent(row: Record<string, unknown>): string {
  return mergeContent([row.email, row.job_title, row.linkedin_username]);
}

function indexSessions(db: Orama<any>, persistedStore: any): void {
  const fields = [
    "user_id",
    "created_at",
    "folder_id",
    "event_id",
    "title",
    "raw_md",
    "enhanced_md",
    "transcript",
  ];

  persistedStore.forEachRow("sessions", (rowId: string) => {
    const row = collectCells(persistedStore, "sessions", rowId, fields);
    const title = toTrimmedString(row.title) || "Untitled";

    void insert(db, {
      id: rowId,
      type: "session",
      title,
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
  const fields = [
    "name",
    "email",
    "org_id",
    "job_title",
    "linkedin_username",
    "is_user",
    "created_at",
  ];

  persistedStore.forEachRow("humans", (rowId: string) => {
    const row = collectCells(persistedStore, "humans", rowId, fields);
    const title = toTrimmedString(row.name) || "Unknown";

    void insert(db, {
      id: rowId,
      type: "human",
      title,
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
  const fields = ["name", "created_at"];

  persistedStore.forEachRow("organizations", (rowId: string) => {
    const row = collectCells(persistedStore, "organizations", rowId, fields);
    const title = toTrimmedString(row.name) || "Unknown Organization";

    void insert(db, {
      id: rowId,
      type: "organization",
      title,
      content: "",
      metadata: JSON.stringify({
        created_at: row.created_at,
      }),
    });
  });
}

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
    metadata: parseMetadata(hit.document.metadata),
    score: hit.score,
  };
}

function sortResultsByScore(a: SearchResult, b: SearchResult): number {
  return b.score - a.score;
}

function toGroup(
  type: SearchEntityType,
  results: SearchResult[],
  visibleCounts: Map<string, number>,
): SearchGroup {
  const visibleCount = visibleCounts.get(type) || ITEMS_PER_PAGE;
  const topScore = results[0]?.score || 0;

  return {
    key: type,
    type,
    title: GROUP_TITLES[type],
    results,
    totalCount: results.length,
    topScore,
    visibleCount,
    hasMore: results.length > visibleCount,
  };
}

function groupSearchResults(
  hits: SearchHit[],
  query: string,
  visibleCounts: Map<string, number>,
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
    .map(([type, results]) => toGroup(type, results.sort(sortResultsByScore), visibleCounts))
    .sort((a, b) => b.topScore - a.topScore);

  const totalResults = groups.reduce((count, group) => count + group.totalCount, 0);

  return {
    groups,
    totalResults,
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
  const lastSearchHits = useRef<SearchHit[]>([]);
  const lastSearchQuery = useRef<string>("");

  const resetSearchState = useCallback(() => {
    setResults(null);
    setVisibleCounts(new Map());
    lastSearchHits.current = [];
    lastSearchQuery.current = "";
  }, []);

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

  const performSearch = useCallback(
    async (searchQuery: string) => {
      const normalizedQuery = normalizeQuery(searchQuery);

      if (!oramaInstance.current || normalizedQuery.length < 2) {
        resetSearchState();
        setIsSearching(false);
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

        const hits = searchResults.hits as unknown as SearchHit[];
        lastSearchHits.current = hits;
        lastSearchQuery.current = normalizedQuery;
        const grouped = groupSearchResults(hits, normalizedQuery, visibleCounts);
        setResults(grouped);
      } catch (error) {
        console.error("Search failed:", error);
        resetSearchState();
      } finally {
        setIsSearching(false);
      }
    },
    [resetSearchState, visibleCounts],
  );

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const normalizedQuery = normalizeQuery(query);

    if (normalizedQuery.length < 2) {
      resetSearchState();
      setIsSearching(false);
    } else {
      debounceTimer.current = setTimeout(() => {
        void performSearch(normalizedQuery);
      }, 300);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, performSearch, resetSearchState]);

  const onFocus = useCallback(() => {
    setIsFocused(true);
    if (!oramaInstance.current) {
      void createIndex();
    }
  }, [createIndex]);

  const onBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const loadMoreInGroup = useCallback((groupKey: string) => {
    setVisibleCounts((prev) => {
      const next = new Map(prev);
      const currentCount = next.get(groupKey) || ITEMS_PER_PAGE;
      next.set(groupKey, currentCount + LOAD_MORE_STEP);

      if (lastSearchHits.current.length > 0 && lastSearchQuery.current) {
        const grouped = groupSearchResults(lastSearchHits.current, lastSearchQuery.current, next);
        setResults(grouped);
      }

      return next;
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
