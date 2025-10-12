import { create, insert, Orama, search as oramaSearch } from "@orama/orama";
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

export interface GroupedSearchResults {
  sessions: SearchResult[];
  humans: SearchResult[];
  organizations: SearchResult[];
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

function groupSearchResults(hits: any[]): GroupedSearchResults {
  const grouped: GroupedSearchResults = {
    sessions: [],
    humans: [],
    organizations: [],
  };

  hits.forEach((hit) => {
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

    if (doc.type === "session") {
      grouped.sessions.push(result);
    } else if (doc.type === "human") {
      grouped.humans.push(result);
    } else if (doc.type === "organization") {
      grouped.organizations.push(result);
    }
  });

  return grouped;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const { persistedStore } = useRouteContext({ from: "__root__" });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);

  const oramaInstance = useRef<Orama<any> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!oramaInstance.current || !searchQuery.trim()) {
      setResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const searchResults = await oramaSearch(oramaInstance.current, {
        term: searchQuery,
        boost: {
          title: 3,
          content: 1,
        },
        limit: 50,
      });

      const grouped = groupSearchResults(searchResults.hits);
      setResults(grouped);
    } catch (error) {
      console.error("Search failed:", error);
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

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
    }),
    [query, results, isSearching, isFocused, isIndexing, onFocus, onBlur],
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
