import { Trans } from "@lingui/react/macro";

import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import type { BaseButtonProps } from "./types";

export function InitialRecordButton({ disabled, onClick }: BaseButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          disabled={disabled}
          onClick={onClick}
          className={cn([
            "w-9 h-9 rounded-full border-2 transition-all outline-none p-0 flex items-center justify-center",
            disabled
              ? "bg-neutral-200 border-neutral-400"
              : "bg-red-500 border-neutral-400 hover:scale-95",
          ])}
          style={{
            boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">
        <p>
          <Trans>Start recording</Trans>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
