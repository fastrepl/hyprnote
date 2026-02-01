import {
  coreTools,
  createToolRegistry,
  readUrlTool,
  toolsRequiringApproval,
} from "@hypr/agent-core";

import { executeCodeTool } from "./execute-code";
import { loopsTool } from "./loops";
import { stripeTool } from "./stripe";
import { supabaseTool } from "./supabase";

const registry = createToolRegistry([
  ...coreTools,
  executeCodeTool,
  loopsTool,
  stripeTool,
  supabaseTool,
]);

export const { tools, toolsByName, registerTool } = registry;

export {
  executeCodeTool,
  loopsTool,
  readUrlTool,
  stripeTool,
  supabaseTool,
  toolsRequiringApproval,
};
