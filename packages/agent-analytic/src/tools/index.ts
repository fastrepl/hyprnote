import type { StructuredToolInterface } from "@langchain/core/tools";

import {
  readUrlTool,
  stripeTool,
  supabaseTool,
  toolsRequiringApproval,
} from "@hypr/agent-support";

import { posthogTool } from "./posthog";

export const tools: StructuredToolInterface[] = [
  readUrlTool,
  posthogTool,
  stripeTool,
  supabaseTool,
];

export const toolsByName: Record<string, StructuredToolInterface> =
  Object.fromEntries(tools.map((t) => [t.name, t]));

export function registerTool(tool: StructuredToolInterface): void {
  tools.push(tool);
  toolsByName[tool.name] = tool;
}

export {
  posthogTool,
  readUrlTool,
  stripeTool,
  supabaseTool,
  toolsRequiringApproval,
};
