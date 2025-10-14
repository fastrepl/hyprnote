import { z } from "zod";

export interface ToolDependencies {
  search: (query: string, filters?: Record<string, any>) => Promise<any[]>;
}

export const toolFactories = {
  search_sessions: (deps: ToolDependencies) => ({
    description: "Search for sessions (meeting notes) using keywords. Returns relevant sessions with their content.",
    parameters: z.object({
      query: z.string().describe("The search query to find relevant sessions"),
    }),
    execute: async (params: { query: string }) => {
      const hits = await deps.search(params.query);

      const results = hits.slice(0, 10).map((hit: any) => ({
        id: hit.document.id,
        title: hit.document.title,
        content: hit.document.content.slice(0, 500),
        score: hit.score,
        created_at: hit.document.created_at,
      }));

      return { results };
    },
  }),
} as const;

export type Tools = {
  [K in keyof typeof toolFactories]: {
    input: Parameters<ReturnType<typeof toolFactories[K]>["execute"]>[0];
    output: Awaited<ReturnType<ReturnType<typeof toolFactories[K]>["execute"]>>;
  };
};

export type ToolPartType = `tool-${keyof Tools}`;
