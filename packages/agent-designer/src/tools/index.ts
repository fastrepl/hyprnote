import type { StructuredToolInterface } from "@langchain/core/tools";

import { readUrlTool, toolsRequiringApproval } from "@hypr/agent-core";

import { magicPatternsTool } from "./magic-patterns";

// Create isolated tools array for designer agent (don't mutate shared core array)
export const tools: StructuredToolInterface[] = [
  readUrlTool,
  magicPatternsTool,
];

export const toolsByName: Record<string, StructuredToolInterface> =
  Object.fromEntries(tools.map((t) => [t.name, t]));

export function registerTool(tool: StructuredToolInterface): void {
  tools.push(tool);
  toolsByName[tool.name] = tool;
}

export { magicPatternsTool, readUrlTool, toolsRequiringApproval };
