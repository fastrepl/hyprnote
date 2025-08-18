import { commands as mcpCommands } from "@hypr/plugin-mcp";
import { dynamicTool, experimental_createMCPClient } from "@hypr/utils/ai";
import { useQuery } from "@tanstack/react-query";
import z from "zod";

const mcpClientCache = new Map<string, any>();

export function useMcpTools() {
  return useQuery({
    queryKey: ["mcp-tools"],
    queryFn: async () => {
      console.log("[MCP] Starting to fetch MCP tools at", new Date().toISOString());
      console.log("[MCP] Cache status:", {
        cachedClients: mcpClientCache.size,
        cachedUrls: Array.from(mcpClientCache.keys()),
      });

      const servers = await mcpCommands.getServers();
      console.log("[MCP] Found servers:", servers.length, servers.map(s => ({ url: s.url, enabled: s.enabled })));

      const enabledServers = servers.filter((server) => server.enabled);
      console.log("[MCP] Enabled servers:", enabledServers.length);

      if (enabledServers.length === 0) {
        console.log("[MCP] No enabled servers, returning empty object");
        return {};
      }

      const allTools: Record<string, any> = {};

      for (const server of enabledServers) {
        const startTime = Date.now();
        console.log(`[MCP] Processing server: ${server.url}`);

        try {
          let mcpClient = mcpClientCache.get(server.url);

          if (!mcpClient) {
            console.log(`[MCP] Creating new client for ${server.url} (not in cache)`);
            mcpClient = await experimental_createMCPClient({
              transport: {
                type: "sse",
                url: server.url,
                onerror: (error) => {
                  console.error(`[MCP] Error from ${server.url}:`, error);
                },
                onclose: () => {
                  console.log(`[MCP] Connection closed for ${server.url}`);
                },
              },
            });

            mcpClientCache.set(server.url, mcpClient);
            console.log(`[MCP] Client created and cached for ${server.url}`);
          } else {
            console.log(`[MCP] Using cached client for ${server.url}`);
          }

          console.log(`[MCP] Fetching tools from ${server.url}...`);
          const tools = await mcpClient.tools();
          const toolCount = Object.keys(tools).length;
          console.log(`[MCP] Received ${toolCount} tools from ${server.url}`);

          for (const [toolName, tool] of Object.entries(tools as Record<string, any>)) {
            allTools[toolName] = dynamicTool({
              description: tool.description,
              inputSchema: tool.inputSchema || z.any(),
              execute: tool.execute,
              toModelOutput: (result: any) => {
                console.log(`[MCP] Tool result:`, result);
                return result;
              },
            });
          }

          const elapsed = Date.now() - startTime;
          console.log(`[MCP] Successfully processed ${server.url} in ${elapsed}ms`);
        } catch (error) {
          const elapsed = Date.now() - startTime;
          console.error(`[MCP] Error fetching tools from ${server.url} after ${elapsed}ms:`, error);

          if (error instanceof Error) {
            console.error(`[MCP] Error name: ${error.name}`);
            console.error(`[MCP] Error message: ${error.message}`);
            console.error(`[MCP] Error stack:`, error.stack);
          }

          mcpClientCache.delete(server.url);
          console.log(`[MCP] Removed failed client from cache for ${server.url}`);
        }
      }

      const totalTools = Object.keys(allTools).length;
      console.log(`[MCP] Completed fetching. Total tools loaded: ${totalTools}`);
      console.log(`[MCP] Tool names:`, Object.keys(allTools));

      return allTools;
    },

    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function clearMcpClientCache() {
  mcpClientCache.clear();
}

export function closeMcpClients() {
  for (const client of mcpClientCache.values()) {
    try {
      client.close();
    } catch (error) {
      console.error(`[MCP] Error closing client:`, error);
    }
  }
}
