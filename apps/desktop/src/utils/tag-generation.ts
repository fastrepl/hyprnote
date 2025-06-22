import { z } from "zod";

import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as templateCommands } from "@hypr/plugin-template";
import { generateText, localProviderName, modelProvider } from "@hypr/utils/ai";

export async function generateTagsForSession(sessionId: string): Promise<string[]> {
  const { type: connectionType } = await connectorCommands.getLlmConnection();

  const config = await dbCommands.getConfig();
  const session = await dbCommands.getSession({ id: sessionId });
  if (!session) {
    throw new Error("Session not found");
  }

  const historicalTags = await dbCommands.listAllTags();
  const currentTags = await dbCommands.listSessionTags(sessionId);

  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    return Array.from(text.matchAll(hashtagRegex), match => match[1]);
  };

  const existingHashtags = extractHashtags(session.raw_memo_html);

  const systemPrompt = await templateCommands.render(
    "suggest_tags.system",
    { config, type: connectionType },
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

  const provider = await modelProvider();
  const model = provider.languageModel("defaultModel");

  const result = await generateText({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    providerOptions: {
      [localProviderName]: {
        metadata: {
          grammar: "tags",
        },
      },
    },
  });

  const schema = z.object({
    tags: z.array(z.string()).min(1).max(5),
  });

  const parsed = schema.safeParse(result.text);
  return parsed.success ? parsed.data.tags : [];
}
