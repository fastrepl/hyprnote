import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";

export async function generateTagsForSession(sessionId: string): Promise<string[]> {
  try {
    // Get LLM connection details
    const connection = await connectorCommands.getLlmConnection();
    const connectionData = connection.connection || connection;
    
    // Get session data
    const session = await dbCommands.getSession({ id: sessionId });
    if (!session) {
      throw new Error("Session not found");
    }

    // Get historical tags
    const historicalTags = await dbCommands.listAllTags();
    const currentTags = await dbCommands.listSessionTags(sessionId);

    // Extract hashtags from content (simple regex approach)
    const hashtagRegex = /#(\w+)/g;
    const existingHashtags: string[] = [];
    let match;
    while ((match = hashtagRegex.exec(session.raw_memo_html)) !== null) {
      existingHashtags.push(match[1]);
    }

    // Prepare context for prompts (simplified version of the backend logic)
    const systemPrompt =
      `You are an AI assistant that generates relevant tags for notes and transcripts. Your task is to suggest 1-5 concise, descriptive tags that best categorize the content.

Guidelines:
- Generate between 1-5 tags
- Tags should be concise (1-3 words)
- Focus on main topics, themes, and key concepts
- Consider the context and purpose of the content
- Avoid overly generic tags
- Make tags useful for searching and organizing`;

    const userPrompt = `Please suggest relevant tags for the following content:

Title: ${session.title}

Content: ${session.raw_memo_html}

Existing hashtags in content: ${existingHashtags.join(", ") || "None"}

Current formal tags: ${currentTags.map(t => t.name).join(", ") || "None"}

Historical tags (for reference): ${historicalTags.slice(0, 20).map(t => t.name).join(", ") || "None"}

Generate relevant tags as a JSON array.`;

    // Make direct HTTP request to the local LLM server
    const requestBody = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      model: "llama",
      metadata: {
        grammar: "tags",
      },
    };

    const response = await fetch(`${connectionData.api_base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(connectionData.api_key && { Authorization: `Bearer ${connectionData.api_key}` }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from LLM");
    }

    // Parse the JSON response
    const tags: string[] = JSON.parse(content);
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    console.error("Error generating tags:", error);
    throw error;
  }
}