import { useRouteContext } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { Highlight } from "@orama/highlight";
import { create, insert, Orama, search as oramaSearch } from "@orama/orama";
import { pluginQPS } from "@orama/plugin-qps";

export type SearchEntityType = "session" | "human" | "organization";

export interface SearchFilters {
  created_at?: {
    gte?: number;
    lte?: number;
    gt?: number;
    lt?: number;
    eq?: number;
  };
}

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  titleHighlighted: string;
  content: string;
  contentHighlighted: string;
  created_at: number;
  folder_id: string;
  event_id: string;
  org_id: string;
  is_user: boolean;
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
}

export interface GroupedSearchResults {
  groups: SearchGroup[];
  totalResults: number;
  maxScore: number;
}

interface SearchContextValue {
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFilters | null;
  setFilters: (filters: SearchFilters | null) => void;
  results: GroupedSearchResults | null;
  isSearching: boolean;
  isFocused: boolean;
  isIndexing: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

interface SearchDocument {
  id: string;
  type: SearchEntityType;
  title: string;
  content: string;
  created_at: number;
  folder_id: string;
  event_id: string;
  org_id: string;
  is_user: boolean;
  metadata: string;
}

interface SearchHit {
  score: number;
  document: SearchDocument;
}

type SerializableObject = Record<string, unknown>;

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

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function toString(value: unknown): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return "";
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return false;
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
      created_at: toNumber(row.created_at),
      folder_id: toString(row.folder_id),
      event_id: toString(row.event_id),
      org_id: "",
      is_user: false,
      metadata: JSON.stringify({}),
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
      created_at: toNumber(row.created_at),
      folder_id: "",
      event_id: "",
      org_id: toString(row.org_id),
      is_user: toBoolean(row.is_user),
      metadata: JSON.stringify({
        email: row.email,
        job_title: row.job_title,
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
      created_at: toNumber(row.created_at),
      folder_id: "",
      event_id: "",
      org_id: "",
      is_user: false,
      metadata: JSON.stringify({}),
    });
  });
}

function buildOramaFilters(filters: SearchFilters | null): Record<string, any> | undefined {
  if (!filters || !filters.created_at) {
    return undefined;
  }

  const createdAtConditions: Record<string, number> = {};

  if (filters.created_at.gte !== undefined) {
    createdAtConditions.gte = filters.created_at.gte;
  }
  if (filters.created_at.lte !== undefined) {
    createdAtConditions.lte = filters.created_at.lte;
  }
  if (filters.created_at.gt !== undefined) {
    createdAtConditions.gt = filters.created_at.gt;
  }
  if (filters.created_at.lt !== undefined) {
    createdAtConditions.lt = filters.created_at.lt;
  }
  if (filters.created_at.eq !== undefined) {
    createdAtConditions.eq = filters.created_at.eq;
  }

  return Object.keys(createdAtConditions).length > 0
    ? { created_at: createdAtConditions }
    : undefined;
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
    created_at: hit.document.created_at,
    folder_id: hit.document.folder_id,
    event_id: hit.document.event_id,
    org_id: hit.document.org_id,
    is_user: hit.document.is_user,
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

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const { persistedStore } = useRouteContext({ from: "__root__" });

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const oramaInstance = useRef<Orama<any> | null>(null);

  const resetSearchState = useCallback(() => {
    setSearchHits([]);
    setSearchQuery("");
  }, []);

  const createIndex = useCallback(async () => {
    if (!persistedStore || isIndexing) {
      return;
    }

    setIsIndexing(true);

    try {
      const db = create({
        schema: {
          id: "string",
          type: "enum",
          title: "string",
          content: "string",
          created_at: "number",
          folder_id: "string",
          event_id: "string",
          org_id: "string",
          is_user: "boolean",
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
    async (searchQueryInput: string, searchFilters: SearchFilters | null) => {
      const normalizedQuery = normalizeQuery(searchQueryInput);

      if (!oramaInstance.current || normalizedQuery.length < 1) {
        resetSearchState();
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const whereClause = buildOramaFilters(searchFilters);

        const searchResults = await oramaSearch(oramaInstance.current, {
          term: normalizedQuery,
          boost: {
            title: 3,
            content: 1,
          },
          limit: 100,
          tolerance: 1,
          ...(whereClause && { where: whereClause }),
        });

        const hits = searchResults.hits as unknown as SearchHit[];
        setSearchHits(hits);
        setSearchQuery(normalizedQuery);
      } catch (error) {
        console.error("Search failed:", error);
        resetSearchState();
      } finally {
        setIsSearching(false);
      }
    },
    [resetSearchState],
  );

  useEffect(() => {
    const normalizedQuery = normalizeQuery(query);

    if (normalizedQuery.length < 1) {
      resetSearchState();
      setIsSearching(false);
    } else {
      void performSearch(normalizedQuery, filters);
    }
  }, [query, filters, performSearch, resetSearchState]);

  const onFocus = useCallback(() => {
    setIsFocused(true);
    if (!oramaInstance.current) {
      void createIndex();
    }
  }, [createIndex]);

  const onBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

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
      isFocused,
      isIndexing,
      onFocus,
      onBlur,
    }),
    [query, filters, results, isSearching, isFocused, isIndexing, onFocus, onBlur],
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
