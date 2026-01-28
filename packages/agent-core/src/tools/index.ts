import type { StructuredToolInterface } from "@langchain/core/tools";

import { executeCodeTool } from "./execute-code";
import { readUrlTool } from "./read-url";

export const tools: StructuredToolInterface[] = [readUrlTool];

export const toolsByName: Record<string, StructuredToolInterface> =
  Object.fromEntries(tools.map((t) => [t.name, t]));

export const toolsRequiringApproval = new Set(["executeCode"]);

export function registerTool(tool: StructuredToolInterface): void {
  tools.push(tool);
  toolsByName[tool.name] = tool;
}

export { executeCodeTool, readUrlTool };
