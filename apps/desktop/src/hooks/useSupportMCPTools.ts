import { useEffect, useState } from "react";

import { useAuth } from "../auth";
import type { ContextItem } from "../chat/context-item";
import { collectSupportContextBlock } from "./useContextCollection";
import { useMCPClient } from "./useMCPClient";
import { useMCPElicitation } from "./useMCPElicitation";

export type { ContextItem };

export function useSupportMCP(enabled: boolean, accessToken?: string | null) {
  const { session } = useAuth();
  const email = session?.user?.email;
  const userId = session?.user?.id;

  const { client, isConnected } = useMCPClient(enabled, accessToken);
  const { pendingElicitation, respondToElicitation } =
    useMCPElicitation(client);

  const [tools, setTools] = useState<Record<string, any>>({});
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [isReady, setIsReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setTools({});
      setSystemPrompt(undefined);
      setContextItems([]);
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
        const [{ items, block }, fetchedTools, prompt] = await Promise.all([
          collectSupportContextBlock(email, userId),
          client.tools(),
          client
            .experimental_getPrompt({ name: "support_chat" })
            .catch(() => null),
        ]);

        if (cancelled) return;

        setContextItems(items);
        setTools(fetchedTools);

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
        if (!cancelled) setIsReady(true);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled, client, isConnected, email, userId]);

  return {
    tools,
    systemPrompt,
    contextItems,
    pendingElicitation,
    respondToElicitation,
    isReady,
  };
}
