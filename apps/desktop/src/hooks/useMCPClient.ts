import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { useEffect, useRef, useState } from "react";

import { env } from "../env";
import { TauriMCPTransport } from "./tauri-mcp-transport";

const TIMEOUT_MS = 5_000;

export function useMCPClient(
  enabled: boolean,
  accessToken?: string | null,
): { client: MCPClient | null; isConnected: boolean; error: Error | null } {
  const [client, setClient] = useState<MCPClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<MCPClient | null>(null);

  useEffect(() => {
    if (!enabled) {
      clientRef.current?.close().catch(console.error);
      clientRef.current = null;
      setClient(null);
      setIsConnected(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setIsConnected(true);
    }, TIMEOUT_MS);

    const init = async () => {
      try {
        const mcpUrl = new URL("/support/mcp", env.VITE_API_URL).toString();

        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const transport = new TauriMCPTransport(mcpUrl, headers);

        const created = await createMCPClient({
          transport,
          name: "hyprnote-support-client",
          capabilities: { elicitation: {} },
          onUncaughtError: (err) => {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("MCP uncaught error:", msg);
          },
        });

        if (cancelled) {
          await created.close().catch(console.error);
          return;
        }

        clientRef.current?.close().catch(console.error);
        clientRef.current = created;
        setClient(created);
        clearTimeout(timeout);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        const connectError =
          err instanceof Error ? err : new Error(String(err));
        console.error("Failed to initialize MCP client:", connectError.message);
        if (!cancelled) {
          clearTimeout(timeout);
          setError(connectError);
          setIsConnected(true);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      clientRef.current?.close().catch(console.error);
      clientRef.current = null;
      setClient(null);
    };
  }, [enabled, accessToken]);

  return { client, isConnected, error };
}
