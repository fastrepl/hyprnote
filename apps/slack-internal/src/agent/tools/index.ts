import type { StructuredToolInterface } from "@langchain/core/tools";

import { executeCodeTool } from "./execute-code";
import { loopsTool } from "./loops";
import { readSlackMessageTool } from "./read-slack-message";
import { readUrlTool } from "./read-url";
import { stripeTool } from "./stripe";
import { supabaseTool } from "./supabase";
import { understandHyprnoteRepoTool } from "./understand-hyprnote-repo";

export const tools = [
  executeCodeTool,
  loopsTool,
  readSlackMessageTool,
  readUrlTool,
  stripeTool,
  supabaseTool,
  understandHyprnoteRepoTool,
];

export const toolsByName: Record<string, StructuredToolInterface> =
  Object.fromEntries(tools.map((t) => [t.name, t]));

export const toolsRequiringApproval = new Set(["executeCode"]);
