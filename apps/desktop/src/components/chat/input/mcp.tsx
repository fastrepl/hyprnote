import { LockIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";

export type McpIndicator =
  | { type: "support" }
  | { type: "pro"; enabled: boolean };

export function McpIndicatorBadge({ indicator }: { indicator: McpIndicator }) {
  if (indicator.type === "support") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-sky-500">
            <span className="size-1.5 rounded-full bg-current" />
            <span className="text-[11px] font-medium leading-none">
              Support MCP
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="z-110">
          This chat is powered by a support MCP server
        </TooltipContent>
      </Tooltip>
    );
  }

  if (indicator.enabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-emerald-500">
            <span className="size-1.5 rounded-full bg-current" />
            <span className="text-[11px] font-medium leading-none">
              Pro MCP
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="z-110">
          Pro MCP tools are active
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-neutral-400">
          <LockIcon size={10} />
          <span className="text-[11px] font-medium leading-none">Pro MCP</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="z-110">
        Upgrade to Pro to unlock MCP tools
      </TooltipContent>
    </Tooltip>
  );
}
