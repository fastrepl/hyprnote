import { tool } from "ai";
import { z } from "zod";

export const searchSessionsTool = tool({
  description: "Search for sessions",
  inputSchema: z.object({
    query: z.string().describe("The query to search for"),
  }),
  execute: async () => {
    return { results: [] };
  },
});

export const tools = {
  search_sessions: searchSessionsTool,
};

export type Tools = {
  [K in keyof typeof tools]: {
    input: Parameters<NonNullable<(typeof tools)[K]["execute"]>>[0];
    output: Awaited<ReturnType<NonNullable<(typeof tools)[K]["execute"]>>>;
  };
};

export type ToolPartType = `tool-${keyof Tools}`;
