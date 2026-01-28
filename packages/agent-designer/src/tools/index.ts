import {
  readUrlTool,
  registerTool,
  tools,
  toolsByName,
  toolsRequiringApproval,
} from "@hypr/agent-core";

import { magicPatternsTool } from "./magic-patterns";

tools.push(magicPatternsTool);
toolsByName[magicPatternsTool.name] = magicPatternsTool;

export {
  magicPatternsTool,
  readUrlTool,
  registerTool,
  tools,
  toolsByName,
  toolsRequiringApproval,
};
