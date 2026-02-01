import { createToolRegistry } from "@hypr/agent-core";
import {
  readUrlTool,
  stripeTool,
  supabaseTool,
  toolsRequiringApproval,
} from "@hypr/agent-support";

import { posthogTool } from "./posthog";

const registry = createToolRegistry([
  readUrlTool,
  posthogTool,
  stripeTool,
  supabaseTool,
]);

export const { tools, toolsByName, registerTool } = registry;

export {
  posthogTool,
  readUrlTool,
  stripeTool,
  supabaseTool,
  toolsRequiringApproval,
};
