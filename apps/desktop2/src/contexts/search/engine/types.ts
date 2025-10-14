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

export interface SearchDocument {
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

export interface SearchEngineContextValue {
  search: (query: string, filters?: SearchFilters | null) => Promise<SearchHit[]>;
  isIndexing: boolean;
}
