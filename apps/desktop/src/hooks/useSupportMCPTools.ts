import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { useEffect, useRef, useState } from "react";

import { env } from "../env";

export function useSupportMCPTools(enabled: boolean) {
  const [tools, setTools] = useState<Record<string, any>>({});
  const [isReady, setIsReady] = useState(false);
  const clientRef = useRef<MCPClient | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTools({});
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
        const mcpTools = await client.tools();

        if (!cancelled) {
          setTools(mcpTools);
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

  return { tools, isReady: enabled ? isReady : true };
}
