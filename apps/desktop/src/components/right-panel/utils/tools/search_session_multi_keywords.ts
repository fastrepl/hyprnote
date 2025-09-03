import { commands as dbCommands } from "@hypr/plugin-db";
import { tool } from "@hypr/utils/ai";
import { z } from "zod";

export const createSearchSessionTool = (userId: string | null) => {
  return tool({
    description:
      "Search for sessions (meeting notes) with multiple keywords. The keywords should be the most important things that the user is talking about. This could be either topics, people, or company names.",
    inputSchema: z.object({
      keywords: z.array(z.string()).min(1).max(5).describe(
        "List of 1 ~ 3 keywords to search for, each keyword should be concise",
      ),
    }),
    execute: async ({ keywords }) => {
      const searchPromises = keywords.map(keyword =>
        dbCommands.listSessions({
          type: "search",
          query: keyword,
          user_id: userId || "",
          limit: 3,
        })
      );

      const searchResults = await Promise.all(searchPromises);

      const combinedResults = new Map();

      searchResults.forEach((sessions, index) => {
        const keyword = keywords[index];
        sessions.forEach(session => {
          if (combinedResults.has(session.id)) {
            combinedResults.get(session.id).matchedKeywords.push(keyword);
          } else {
            combinedResults.set(session.id, {
              ...session,
              matchedKeywords: [keyword],
            });
          }
        });
      });

      const finalResults = Array.from(combinedResults.values())
        .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);

      return {
        results: finalResults,
        summary: {
          totalSessions: finalResults.length,
          keywordsSearched: keywords,
          sessionsByKeywordCount: finalResults.reduce((acc, session) => {
            const count = session.matchedKeywords.length;
            acc[count] = (acc[count] || 0) + 1;
            return acc;
          }, {} as Record<number, number>),
        },
      };
    },
  });
};
