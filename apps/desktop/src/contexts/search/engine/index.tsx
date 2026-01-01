import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  commands,
  destroyPagefind,
  type IndexRecord,
  initPagefind,
  search as pagefindSearch,
  type PagefindSearchFragment,
  type PagefindSearchResult,
} from "@hypr/plugin-pagefind";

import { type Store as MainStore } from "../../../store/tinybase/store/main";
import {
  createHumanSearchableContent,
  createSessionSearchableContent,
} from "./content";
import type { SearchEntityType, SearchFilters, SearchHit } from "./types";
import {
  collectCells,
  normalizeQuery,
  toEpochMs,
  toTrimmedString,
} from "./utils";

export type {
  SearchDocument,
  SearchEntityType,
  SearchFilters,
  SearchHit,
} from "./types";

const SearchEngineContext = createContext<{
  search: (
    query: string,
    filters?: SearchFilters | null,
  ) => Promise<SearchHit[]>;
  isIndexing: boolean;
} | null>(null);

function buildRecordsFromStore(store: MainStore): IndexRecord[] {
  const records: IndexRecord[] = [];

  const sessionFields = [
    "user_id",
    "created_at",
    "folder_id",
    "event_id",
    "title",
    "raw_md",
    "enhanced_md",
    "transcript",
  ];

  store.forEachRow("sessions", (rowId, _forEachCell) => {
    const row = collectCells(store, "sessions", rowId, sessionFields);
    const title = toTrimmedString(row.title) || "Untitled";
    const createdAt = toEpochMs(row.created_at);

    records.push({
      url: rowId,
      content: createSessionSearchableContent(row),
      title,
      filters: { type: ["session"] },
      meta: { id: rowId, created_at: String(createdAt) },
    });
  });

  const humanFields = [
    "name",
    "email",
    "org_id",
    "job_title",
    "linkedin_username",
    "created_at",
  ];

  store.forEachRow("humans", (rowId, _forEachCell) => {
    const row = collectCells(store, "humans", rowId, humanFields);
    const title = toTrimmedString(row.name) || "Unknown";
    const createdAt = toEpochMs(row.created_at);

    records.push({
      url: rowId,
      content: createHumanSearchableContent(row),
      title,
      filters: { type: ["human"] },
      meta: { id: rowId, created_at: String(createdAt) },
    });
  });

  const orgFields = ["name", "created_at"];

  store.forEachRow("organizations", (rowId, _forEachCell) => {
    const row = collectCells(store, "organizations", rowId, orgFields);
    const title = toTrimmedString(row.name) || "Unknown Organization";
    const createdAt = toEpochMs(row.created_at);

    records.push({
      url: rowId,
      content: "",
      title,
      filters: { type: ["organization"] },
      meta: { id: rowId, created_at: String(createdAt) },
    });
  });

  return records;
}

async function loadFragmentData(
  result: PagefindSearchResult,
): Promise<PagefindSearchFragment> {
  return result.data();
}

function fragmentToSearchHit(
  fragment: PagefindSearchFragment,
  score: number,
): SearchHit {
  const type = (fragment.filters?.type?.[0] ?? "session") as SearchEntityType;
  const id = fragment.meta?.id ?? fragment.url;
  const title = fragment.meta?.title ?? "";
  const createdAt = Number(fragment.meta?.created_at ?? 0);

  return {
    score,
    document: {
      id,
      type,
      title,
      content: fragment.raw_content ?? fragment.content,
      created_at: createdAt,
    },
    titleHighlighted: title,
    contentHighlighted: fragment.excerpt,
  };
}

function applyDateFilters(
  hits: SearchHit[],
  filters: SearchFilters | null,
): SearchHit[] {
  if (!filters?.created_at) {
    return hits;
  }

  const { gte, lte, gt, lt, eq } = filters.created_at;

  return hits.filter((hit) => {
    const ts = hit.document.created_at;
    if (gte !== undefined && ts < gte) return false;
    if (lte !== undefined && ts > lte) return false;
    if (gt !== undefined && ts <= gt) return false;
    if (lt !== undefined && ts >= lt) return false;
    if (eq !== undefined && ts !== eq) return false;
    return true;
  });
}

export function SearchEngineProvider({
  children,
  store,
}: {
  children: React.ReactNode;
  store?: MainStore;
}) {
  const [isIndexing, setIsIndexing] = useState(true);
  const isIndexingRef = useRef(false);

  useEffect(() => {
    if (!store) {
      return;
    }

    const buildIndex = async () => {
      if (isIndexingRef.current) {
        return;
      }

      isIndexingRef.current = true;
      setIsIndexing(true);

      try {
        await destroyPagefind();
        await commands.clearIndex();

        const records = buildRecordsFromStore(store);
        const result = await commands.buildIndex(records);

        if (result.status === "error") {
          console.error("Failed to build search index:", result.error);
          return;
        }

        await initPagefind();
      } catch (error) {
        console.error("Failed to create search index:", error);
      } finally {
        isIndexingRef.current = false;
        setIsIndexing(false);
      }
    };

    void buildIndex();

    const handleFocus = () => {
      void buildIndex();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      void destroyPagefind();
    };
  }, [store]);

  const search = useCallback(
    async (
      query: string,
      filters: SearchFilters | null = null,
    ): Promise<SearchHit[]> => {
      const normalizedQuery = normalizeQuery(query);

      if (normalizedQuery.length < 1) {
        return [];
      }

      try {
        const response = await pagefindSearch(normalizedQuery);

        const fragments = await Promise.all(
          response.results.slice(0, 100).map(loadFragmentData),
        );

        const hits = fragments.map((fragment, i) =>
          fragmentToSearchHit(fragment, response.results[i]?.score ?? 0),
        );

        return applyDateFilters(hits, filters);
      } catch (error) {
        console.error("Search failed:", error);
        return [];
      }
    },
    [],
  );

  const value = {
    search,
    isIndexing,
  };

  return (
    <SearchEngineContext.Provider value={value}>
      {children}
    </SearchEngineContext.Provider>
  );
}

export function useSearchEngine() {
  const context = useContext(SearchEngineContext);
  if (!context) {
    throw new Error("useSearchEngine must be used within SearchEngineProvider");
  }
  return context;
}
