import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { useEffect, useRef, useState } from "react";

import { env } from "../env";

export function useSupportMCP(enabled: boolean) {
  const [tools, setTools] = useState<Record<string, any>>({});
  const [systemPrompt, setSystemPrompt] = useState<string | undefined>();
  const [isReady, setIsReady] = useState(false);
  const clientRef = useRef<MCPClient | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTools({});
      setSystemPrompt(undefined);
      setIsReady(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const mcpUrl = new URL("/support/mcp", env.VITE_AI_URL).toString();

        const client = await createMCPClient({
          transport: {
            type: "http",
            url: mcpUrl,
          },
          name: "hyprnote-support-client",
        });

        if (cancelled) {
          await client.close();
          return;
        }

        clientRef.current = client;

        const [mcpTools, prompt] = await Promise.all([
          client.tools(),
          client
            .experimental_getPrompt({ name: "support_chat" })
            .catch(() => null),
        ]);

        if (!cancelled) {
          setTools(mcpTools);

          if (prompt?.messages) {
            const text = prompt.messages
              .map(
                (m: { content: { type: string; text?: string } | string }) => {
                  if (typeof m.content === "string") return m.content;
                  if (m.content.type === "text" && m.content.text)
                    return m.content.text;
                  return "";
                },
              )
              .filter(Boolean)
              .join("\n\n");
            if (text) setSystemPrompt(text);
          }

          setIsReady(true);
        }
      } catch (error) {
        console.error("Failed to initialize MCP client:", error);
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      clientRef.current?.close().catch(console.error);
      clientRef.current = null;
    };
  }, [enabled]);

  return {
    tools,
    systemPrompt,
    isReady: enabled ? isReady : true,
  };
}
