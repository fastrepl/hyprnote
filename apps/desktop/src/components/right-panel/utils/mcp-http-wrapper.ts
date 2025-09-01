import { dynamicTool, jsonSchema } from "@hypr/utils/ai";
import { Client } from "@modelcontextprotocol/sdk/client";
import { z } from "zod";

export async function buildVercelToolsFromMcp(client: Client) {
  const { tools: mcpTools } = await client.listTools();

  const vercelTools: Record<string, ReturnType<typeof dynamicTool>> = {};

  for (const mcpTool of mcpTools) {
    const schema = mcpTool.inputSchema
      ? jsonSchema(mcpTool.inputSchema as any)
      : z.any();

    vercelTools[mcpTool.name] = dynamicTool({
      description: mcpTool.description || (mcpTool as any).title || `Tool: ${mcpTool.name}`,
      inputSchema: schema,

      execute: async (args: unknown) => {
        const result = await client.callTool({
          name: mcpTool.name,
          arguments: (args ?? undefined) as Record<string, unknown> | undefined,
        });

        return result.content;
      },
    });
  }

  return vercelTools;
}
