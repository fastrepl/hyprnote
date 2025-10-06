import { commands as dbCommands } from "@hypr/plugin-db";
import { tool } from "@hypr/utils/ai";
import { z } from "zod";

export const createSearchSessionDateRangeTool = (userId: string | null) => {
  return tool({
    description:
      "Search for sessions (meeting notes) within a specific date range. Returns sessions with their enhanced memo content from the specified time period.",
    inputSchema: z.object({
      startDate: z.string().describe(
        "Start date in ISO 8601 format (e.g., '2024-01-01T00:00:00Z')",
      ),
      endDate: z.string().describe(
        "End date in ISO 8601 format (e.g., '2024-01-31T23:59:59Z')",
      ),
      limit: z.number().min(1).max(100).default(50).describe(
        "Maximum number of sessions to return (1-100, default: 50)",
      ),
    }),
    execute: async ({ startDate, endDate, limit }) => {
      // Validate date format
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date format. Please use ISO 8601 format (e.g., '2024-01-01T00:00:00Z')");
      }

      if (start >= end) {
        throw new Error("Start date must be before end date");
      }

      // Query sessions within the date range
      const sessions = await dbCommands.listSessions({
        type: "dateRange",
        user_id: userId || "",
        start: startDate,
        end: endDate,
        limit: limit,
      });

      // Process sessions to extract relevant content
      const processedSessions = sessions.map(session => ({
        id: session.id,
        title: session.title,
        created_at: session.created_at,
        visited_at: session.visited_at,
        enhanced_memo_html: session.enhanced_memo_html,
        raw_memo_html: session.raw_memo_html,
        pre_meeting_memo_html: session.pre_meeting_memo_html,
        calendar_event_id: session.calendar_event_id,
        record_start: session.record_start,
        record_end: session.record_end,
        // Check if session has enhanced content
        has_enhanced_content: !!session.enhanced_memo_html && session.enhanced_memo_html.trim() !== "",
        has_raw_content: !!session.raw_memo_html && session.raw_memo_html.trim() !== "",
        has_pre_meeting_content: !!session.pre_meeting_memo_html && session.pre_meeting_memo_html.trim() !== "",
      }));

      // Filter out empty sessions if needed
      const nonEmptySessions = processedSessions.filter(session =>
        session.has_enhanced_content || session.has_raw_content || session.has_pre_meeting_content
      );

      return {
        sessions: nonEmptySessions,
        metadata: {
          total_found: sessions.length,
          non_empty_sessions: nonEmptySessions.length,
          date_range: {
            start: startDate,
            end: endDate,
          },
          query_limit: limit,
          sessions_with_enhanced_content: nonEmptySessions.filter(s => s.has_enhanced_content).length,
          sessions_with_raw_content: nonEmptySessions.filter(s => s.has_raw_content).length,
          sessions_with_pre_meeting_content: nonEmptySessions.filter(s => s.has_pre_meeting_content).length,
        },
      };
    },
  });
};
