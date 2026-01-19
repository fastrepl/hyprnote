import type { StructuredToolInterface } from "@langchain/core/tools";

import { executeCodeTool } from "./execute-code";
import { loopsTool } from "./loops";
import { readUrlTool } from "./read-url";
import { stripeTool } from "./stripe";
import { supabaseTool } from "./supabase";

export const tools: StructuredToolInterface[] = [
  executeCodeTool,
  loopsTool,
  readUrlTool,
  stripeTool,
  supabaseTool,
];

export const toolsByName: Record<string, StructuredToolInterface> =
  Object.fromEntries(tools.map((t) => [t.name, t]));

export const toolsRequiringApproval = new Set(["executeCode"]);

export function registerTool(tool: StructuredToolInterface): void {
  tools.push(tool);
  toolsByName[tool.name] = tool;
}

export { executeCodeTool, loopsTool, readUrlTool, stripeTool, supabaseTool };
