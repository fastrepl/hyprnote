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
