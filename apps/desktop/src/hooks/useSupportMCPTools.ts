import type { ToolSet } from "ai";
import { useEffect, useState } from "react";

import type { ContextEntity } from "../chat/context-item";
import { collectSupportContextBlock } from "../chat/context/support-block";
import { useMCPClient } from "./useMCPClient";
import { useMCPElicitation } from "./useMCPElicitation";

export function useSupportMCP(enabled: boolean, accessToken?: string | null) {
  const { client, isConnected } = useMCPClient(enabled, accessToken);
  const { pendingElicitation, respondToElicitation } =
    useMCPElicitation(client);

  const [tools, setTools] = useState<ToolSet>({});
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const [contextEntities, setContextEntities] = useState<ContextEntity[]>([]);
  const [isReady, setIsReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setTools({});
      setSystemPrompt(undefined);
      setContextEntities([]);
      setIsReady(true);
      return;
    }

    if (!isConnected || !client) {
      setIsReady(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [{ entities, block }, fetchedTools, prompt] = await Promise.all([
          collectSupportContextBlock(),
          client.tools(),
          client
            .experimental_getPrompt({ name: "support_chat" })
            .catch(() => null),
        ]);

        if (cancelled) return;

        setContextEntities(entities);
        setTools(fetchedTools as ToolSet);

        let mcpPrompt: string | undefined;
        if (prompt?.messages) {
          mcpPrompt = prompt.messages
            .map((m: { content: { type: string; text?: string } | string }) => {
              if (typeof m.content === "string") return m.content;
              if (m.content.type === "text" && m.content.text)
                return m.content.text;
              return "";
            })
            .filter(Boolean)
            .join("\n\n");
        }
        setSystemPrompt(
          [mcpPrompt, block].filter(Boolean).join("\n\n") || undefined,
        );
        setIsReady(true);
      } catch (error) {
        console.error("Failed to load MCP resources:", error);
        if (cancelled) return;
        setTools({});
        setSystemPrompt(undefined);
        setContextEntities([]);
        setIsReady(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled, client, isConnected]);

  return {
    tools,
    systemPrompt,
    contextEntities,
    pendingElicitation,
    respondToElicitation,
    isReady,
  };
}
