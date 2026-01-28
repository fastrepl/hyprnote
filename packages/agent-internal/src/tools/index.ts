import type { StructuredToolInterface } from "@langchain/core/tools";

import {
  coreTools,
  readUrlTool,
  toolsRequiringApproval,
} from "@hypr/agent-core";

import { executeCodeTool } from "./execute-code";
import { loopsTool } from "./loops";
import { stripeTool } from "./stripe";
import { supabaseTool } from "./supabase";

export const tools: StructuredToolInterface[] = [
  ...coreTools,
  executeCodeTool,
  loopsTool,
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
  executeCodeTool,
  loopsTool,
  readUrlTool,
  stripeTool,
  supabaseTool,
  toolsRequiringApproval,
};
