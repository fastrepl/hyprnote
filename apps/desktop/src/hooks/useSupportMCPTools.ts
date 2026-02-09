import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { env } from "../env";

export function useSupportMCP(enabled: boolean) {
  const clientRef = useRef<MCPClient | null>(null);

  const { data, isSuccess } = useQuery({
    enabled,
    queryKey: ["support-mcp"],
    staleTime: Infinity,
    queryFn: async () => {
      const mcpUrl = new URL("/support/mcp", env.VITE_AI_URL).toString();

      const client = await createMCPClient({
        transport: { type: "http", url: mcpUrl },
        name: "hyprnote-support-client",
      });

      clientRef.current = client;

      const [tools, prompt] = await Promise.all([
        client.tools(),
        client
          .experimental_getPrompt({ name: "support_chat" })
          .catch(() => null),
      ]);

      let systemPrompt: string | undefined;
      if (prompt?.messages) {
        const text = prompt.messages
          .map((m: { content: { type: string; text?: string } | string }) => {
            if (typeof m.content === "string") return m.content;
            if (m.content.type === "text" && m.content.text)
              return m.content.text;
            return "";
          })
          .filter(Boolean)
          .join("\n\n");
        if (text) systemPrompt = text;
      }

      return { tools, systemPrompt };
    },
  });

  useEffect(() => {
    return () => {
      clientRef.current?.close().catch(console.error);
      clientRef.current = null;
    };
  }, []);

  return {
    tools: data?.tools ?? {},
    systemPrompt: data?.systemPrompt,
    isReady: enabled ? isSuccess : true,
  };
}
