import { Orama } from "@orama/orama";

export type SearchEntityType = "session" | "human" | "organization";

export const SEARCH_SCHEMA = {
  id: "string",
  type: "enum",
  title: "string",
  content: "string",
  created_at: "number",
} as const;

export type Index = Orama<typeof SEARCH_SCHEMA>;

export type SearchFilters = {
  created_at?: {
    gte?: number;
    lte?: number;
    gt?: number;
    lt?: number;
    eq?: number;
  };
};

export type SearchDocument = {
  id: string;
  type: SearchEntityType;
  title: string;
  content: string;
  created_at: number;
};

export type SearchHit = {
  score: number;
  document: SearchDocument;
};

export type SearchEngineContextValue = {
  search: (query: string, filters?: SearchFilters | null) => Promise<SearchHit[]>;
  isIndexing: boolean;
};
