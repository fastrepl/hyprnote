import {
  readUrlTool,
  registerTool,
  tools,
  toolsByName,
  toolsRequiringApproval,
} from "@hypr/agent-core";

import { executeCodeTool } from "./execute-code";
import { loopsTool } from "./loops";
import { stripeTool } from "./stripe";
import { supabaseTool } from "./supabase";

tools.push(loopsTool, stripeTool, supabaseTool);
toolsByName[loopsTool.name] = loopsTool;
toolsByName[stripeTool.name] = stripeTool;
toolsByName[supabaseTool.name] = supabaseTool;

export {
  executeCodeTool,
  loopsTool,
  readUrlTool,
  registerTool,
  stripeTool,
  supabaseTool,
  tools,
  toolsByName,
  toolsRequiringApproval,
};
