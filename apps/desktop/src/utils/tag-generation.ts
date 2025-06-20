import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as templateCommands } from "@hypr/plugin-template";
import { generateObject } from "ai";
import { z } from "zod";

const TagsSchema = z.object({
  tags: z.array(z.string()).min(1).max(5),
});

export async function generateTagsForSession(sessionId: string): Promise<string[]> {
  try {
    // Get LLM connection details
    const connection = await connectorCommands.getLlmConnection();
    const connectionData = connection.connection;

    // Get configuration and session data
    const config = await dbCommands.getConfig();
    const session = await dbCommands.getSession({ id: sessionId });
    if (!session) {
      throw new Error("Session not found");
    }

    // Get historical tags
    const historicalTags = await dbCommands.listAllTags();
    const currentTags = await dbCommands.listSessionTags(sessionId);

    // Extract hashtags from content
    const hashtagRegex = /#(\w+)/g;
    const existingHashtags: string[] = [];
    let match;
    while ((match = hashtagRegex.exec(session.raw_memo_html)) !== null) {
      existingHashtags.push(match[1]);
    }

    // Determine connection type
    const type = connection.type;

    // Render templates
    const systemPrompt = await templateCommands.render(
      "suggest_tags.system",
      { config, type },
    );

    const userPrompt = await templateCommands.render(
      "suggest_tags.user",
      {
        title: session.title,
        content: session.raw_memo_html,
        existing_hashtags: existingHashtags,
        formal_tags: currentTags.map(t => t.name),
        historical_tags: historicalTags.slice(0, 20).map(t => t.name),
      },
    );

    // Create a custom language model for the local LLM server
    const customModel = {
      modelId: "llama",
      doGenerate: async (options: any) => {
        const requestBody = {
          messages: options.prompt.messages,
          stream: false,
          model: "llama",
          metadata: options.providerOptions?.metadata || {},
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

        return {
          text: content,
          finishReason: "stop",
        };
      },
    };

    // Generate tags using AI SDK's generateObject
    const result = await generateObject({
      model: customModel as any,
      schema: TagsSchema,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      providerOptions: {
        metadata: {
          grammar: "tags",
        },
      },
    });

    return result.object.tags;
  } catch (error) {
    console.error("Error generating tags:", error);
    throw error;
  }
}
