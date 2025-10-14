import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { create, search as oramaSearch } from "@orama/orama";
import { pluginQPS } from "@orama/plugin-qps";

import { type Store as PersistedStore } from "../../../store/tinybase/persisted";
import { buildOramaFilters } from "./filters";
import { indexHumans, indexOrganizations, indexSessions } from "./indexing";
import { createHumanListener, createOrganizationListener, createSessionListener } from "./listeners";
import type { Index, SearchEngineContextValue, SearchFilters, SearchHit } from "./types";
import { SEARCH_SCHEMA } from "./types";
import { normalizeQuery } from "./utils";

export type { SearchEntityType, SearchFilters, SearchHit } from "./types";

const SearchEngineContext = createContext<SearchEngineContextValue | null>(null);

export function SearchEngineProvider({ children, store }: { children: React.ReactNode; store?: PersistedStore }) {
  const [isIndexing, setIsIndexing] = useState(true);
  const oramaInstance = useRef<Index | null>(null);
  const listenerIds = useRef<string[]>([]);

  useEffect(() => {
    if (!store) {
      return;
    }

    const initializeIndex = async () => {
      setIsIndexing(true);

      try {
        const db = create({
          schema: SEARCH_SCHEMA,
          plugins: [pluginQPS()],
        });

        indexSessions(db, store);
        indexHumans(db, store);
        indexOrganizations(db, store);

        oramaInstance.current = db;

        const listener1 = store.addRowListener(
          "sessions",
          null,
          createSessionListener(oramaInstance.current),
        );
        const listener2 = store.addRowListener(
          "humans",
          null,
          createHumanListener(oramaInstance.current),
        );
        const listener3 = store.addRowListener(
          "organizations",
          null,
          createOrganizationListener(oramaInstance.current),
        );

        listenerIds.current = [listener1, listener2, listener3];
      } catch (error) {
        console.error("Failed to create search index:", error);
      } finally {
        setIsIndexing(false);
      }
    };

    void initializeIndex();

    return () => {
      listenerIds.current.forEach((id) => {
        store.delListener(id);
      });
      listenerIds.current = [];
    };
  }, [store]);

  const search = useCallback(
    async (query: string, filters: SearchFilters | null = null): Promise<SearchHit[]> => {
      const normalizedQuery = normalizeQuery(query);

      if (normalizedQuery.length < 1) {
        return [];
      }

      if (!oramaInstance.current) {
        return [];
      }

      try {
        const whereClause = buildOramaFilters(filters);

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

        return searchResults.hits as SearchHit[];
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

  return <SearchEngineContext.Provider value={value}>{children}</SearchEngineContext.Provider>;
}

export function useSearchEngine() {
  const context = useContext(SearchEngineContext);
  if (!context) {
    throw new Error("useSearchEngine must be used within SearchEngineProvider");
  }
  return context;
}
