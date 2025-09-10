import { commands as dbCommands } from "@hypr/plugin-db";

/**
 * Prepares context text by finding recent enhanced notes for given tags
 * @param tags Array of tag names to search for
 * @param currentSessionId Session ID to exclude from results
 * @param userId User ID for querying sessions
 * @returns Combined context text from enhanced meeting notes
 */
export async function prepareContextText(
  tags: string[],
  currentSessionId: string,
  userId: string
): Promise<string> {
  if (!tags.length) {
    return "";
  }

  // Get all tags to map names to IDs
  const allTags = await dbCommands.listAllTags();
  const tagMap = new Map(allTags.map(tag => [tag.name, tag.id]));
  
  // Find tag IDs for the provided tag names
  const tagIds = tags
    .map(tagName => tagMap.get(tagName))
    .filter((id): id is string => id !== undefined);

  if (!tagIds.length) {
    return "";
  }

  // Collect sessions for each tag
  const allSessions = new Map(); // Use Map to avoid duplicates by session ID
  
  for (const tagId of tagIds) {
    try {
      const sessions = await dbCommands.listSessions({
        type: "tagFilter",
        tag_ids: [tagId],
        user_id: userId,
        limit: 10, // Get more than needed, we'll filter and sort
      });

      // Add sessions to map, excluding current session
      sessions.forEach(session => {
        if (session.id !== currentSessionId && 
            session.enhanced_memo_html && 
            session.enhanced_memo_html.trim().length > 0) {
          allSessions.set(session.id, session);
        }
      });
    } catch (error) {
      console.warn(`Failed to fetch sessions for tag ${tagId}:`, error);
    }
  }

  // Sort by created_at (most recent first) and take top 2
  const sortedSessions = Array.from(allSessions.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 2);

  if (!sortedSessions.length) {
    return "";
  }

  // Combine session content into context text
  const contextParts = sortedSessions.map((session, index) => {
    // Strip HTML tags from enhanced_memo_html
    const cleanContent = session.enhanced_memo_html!
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .trim();

    return `--- Session ${index + 1}: "${session.title || 'Untitled Note'}" ---\n${cleanContent}`;
  });

  return contextParts.join('\n\n');
}
