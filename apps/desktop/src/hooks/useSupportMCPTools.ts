import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { env } from "../env";

const TIMEOUT_MS = 10_000;

export function useSupportMCP(enabled: boolean) {
  const queryClient = useQueryClient();
  const clientRef = useRef<MCPClient | null>(null);

  const { data, isSuccess, isError } = useQuery({
    enabled,
    queryKey: ["support-mcp"],
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const mcpUrl = new URL("/support/mcp", env.VITE_AI_URL).toString();

      const client = await createMCPClient({
        transport: { type: "http", url: mcpUrl },
        name: "hyprnote-support-client",
      });

      if (signal.aborted) {
        await client.close().catch(console.error);
        throw new DOMException("Aborted", "AbortError");
      }

      clientRef.current?.close().catch(console.error);
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
    if (!enabled) {
      clientRef.current?.close().catch(console.error);
      clientRef.current = null;
      queryClient.removeQueries({ queryKey: ["support-mcp"] });
    }
  }, [enabled, queryClient]);

  const isTimedOut = useTimedOut(enabled && !isSuccess && !isError, TIMEOUT_MS);

  return {
    tools: data?.tools ?? {},
    systemPrompt: data?.systemPrompt,
    isReady: enabled ? isSuccess || isError || isTimedOut : true,
  };
}

function useTimedOut(active: boolean, ms: number): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!active) {
      setTimedOut(false);
      return;
    }
    const id = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(id);
  }, [active, ms]);

  return timedOut;
}
