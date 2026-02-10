import { tool } from "ai";
import { z } from "zod";

import { searchFiltersSchema } from "../contexts/search/engine/types";
import type { SearchFilters, SearchHit } from "../contexts/search/engine/types";
import type { SupportMcpTools } from "./support-mcp-tools";

export interface ToolDependencies {
  search: (
    query: string,
    filters?: SearchFilters | null,
  ) => Promise<SearchHit[]>;
}

const buildSearchSessionsTool = (deps: ToolDependencies) =>
  tool({
    description: `
  Search for sessions (meeting notes) using query and filters.
  Returns relevant sessions with their content.
  `.trim(),
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant sessions"),
      filters: searchFiltersSchema
        .optional()
        .describe("Optional filters for the search query"),
    }),
    execute: async (params: { query: string; filters?: SearchFilters }) => {
      const hits = await deps.search(params.query, params.filters || null);

      const results = hits.slice(0, 5).map((hit) => ({
        id: hit.document.id,
        title: hit.document.title,
        content: hit.document.content.slice(0, 500),
        score: hit.score,
        created_at: hit.document.created_at,
      }));

      return { results };
    },
  });

export const buildChatTools = (deps: ToolDependencies) => ({
  search_sessions: buildSearchSessionsTool(deps),
});

type LocalTools = {
  search_sessions: {
    input: { query: string; filters?: SearchFilters };
    output: {
      results: Array<{
        id: string;
        title: string;
        content: string;
        score: number;
        created_at: number;
      }>;
    };
  };
};

export type Tools = LocalTools & SupportMcpTools;

export type ToolPartType = `tool-${keyof Tools}`;
