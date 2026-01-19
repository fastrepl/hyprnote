import type { StructuredToolInterface } from "@langchain/core/tools";

import { executeCodeTool } from "./execute-code";
import { loopsTool } from "./loops";
import { readUrlTool } from "./read-url";
import { stripeTool } from "./stripe";
import { supabaseTool } from "./supabase";

export const tools = [
  executeCodeTool,
  loopsTool,
  readUrlTool,
  stripeTool,
  supabaseTool,
];

export const toolsByName: Record<string, StructuredToolInterface> =
  Object.fromEntries(tools.map((t) => [t.name, t]));

export const toolsRequiringApproval = new Set(["executeCode"]);

export { executeCodeTool, loopsTool, readUrlTool, stripeTool, supabaseTool };
