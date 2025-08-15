import { useQuery } from "@tanstack/react-query";
import { commands as mcpCommands } from "@hypr/plugin-mcp";
import { experimental_createMCPClient, dynamicTool } from "@hypr/utils/ai";


// fetch mcp servers and extract tools from them
export function useMcpTools() {

    return useQuery({
        queryKey: ["mcp-tools"],
        queryFn: async () => {
            const servers = await mcpCommands.getServers();
            const enabledServers = servers.filter((server) => server.enabled);


            if(enabledServers.length === 0) {
                return [];
            }

            
        }
    })



}