import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { create, insert, Orama, remove, search as oramaSearch, update } from "@orama/orama";
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

export interface SearchHit {
  score: number;
  document: SearchDocument;
}

interface SearchEngineContextValue {
  search: (query: string, filters?: SearchFilters | null) => Promise<SearchHit[]>;
  isIndexing: boolean;
}

const SPACE_REGEX = /\s+/g;

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

const SearchEngineContext = createContext<SearchEngineContextValue | null>(null);

export function SearchEngineProvider({ children, persistedStore }: { children: React.ReactNode; persistedStore: any }) {
  const [isIndexing, setIsIndexing] = useState(true);
  const oramaInstance = useRef<Orama<any> | null>(null);
  const listenerIds = useRef<string[]>([]);

  useEffect(() => {
    if (!persistedStore) {
      return;
    }

    const initializeIndex = async () => {
      setIsIndexing(true);

      try {
        // this is synchronous
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

        const handleSessionChange = (store: any, _tableId: string, rowId: string) => {
          if (!oramaInstance.current) {
            return;
          }

          try {
            const rowExists = store.getRow("sessions", rowId);

            if (!rowExists) {
              void remove(oramaInstance.current, rowId);
            } else {
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
              const row = collectCells(store, "sessions", rowId, fields);
              const title = toTrimmedString(row.title) || "Untitled";

              void update(oramaInstance.current, rowId, {
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
            }
          } catch (error) {
            console.error("Failed to update session in search index:", error);
          }
        };

        const handleHumanChange = (store: any, _tableId: string, rowId: string) => {
          if (!oramaInstance.current) {
            return;
          }

          try {
            const rowExists = store.getRow("humans", rowId);

            if (!rowExists) {
              void remove(oramaInstance.current, rowId);
            } else {
              const fields = [
                "name",
                "email",
                "org_id",
                "job_title",
                "linkedin_username",
                "is_user",
                "created_at",
              ];
              const row = collectCells(store, "humans", rowId, fields);
              const title = toTrimmedString(row.name) || "Unknown";

              void update(oramaInstance.current, rowId, {
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
            }
          } catch (error) {
            console.error("Failed to update human in search index:", error);
          }
        };

        const handleOrganizationChange = (store: any, _tableId: string, rowId: string) => {
          if (!oramaInstance.current) {
            return;
          }

          try {
            const rowExists = store.getRow("organizations", rowId);

            if (!rowExists) {
              void remove(oramaInstance.current, rowId);
            } else {
              const fields = ["name", "created_at"];
              const row = collectCells(store, "organizations", rowId, fields);
              const title = toTrimmedString(row.name) || "Unknown Organization";

              void update(oramaInstance.current, rowId, {
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
            }
          } catch (error) {
            console.error("Failed to update organization in search index:", error);
          }
        };

        const listener1 = persistedStore.addRowListener("sessions", null, handleSessionChange);
        const listener2 = persistedStore.addRowListener("humans", null, handleHumanChange);
        const listener3 = persistedStore.addRowListener("organizations", null, handleOrganizationChange);

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
        persistedStore.delListener(id);
      });
      listenerIds.current = [];
    };
  }, [persistedStore]);

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

        return searchResults.hits as unknown as SearchHit[];
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
