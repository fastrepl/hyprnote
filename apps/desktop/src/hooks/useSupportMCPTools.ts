import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { useEffect, useRef, useState } from "react";

import { env } from "../env";

export function useSupportMCPTools() {
  const [tools, setTools] = useState<Record<string, any>>({});
  const clientRef = useRef<MCPClient | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const mcpUrl = new URL("/support/mcp", env.VITE_AI_URL).toString();

        const client = await createMCPClient({
          transport: {
            type: "http",
            url: mcpUrl,
            fetch: tauriFetch as unknown as typeof globalThis.fetch,
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
        }
      } catch (error) {
        console.error("Failed to initialize MCP client:", error);
      }
    };

    init();

    return () => {
      cancelled = true;
      clientRef.current?.close().catch(console.error);
      clientRef.current = null;
    };
  }, []);

  return tools;
}
