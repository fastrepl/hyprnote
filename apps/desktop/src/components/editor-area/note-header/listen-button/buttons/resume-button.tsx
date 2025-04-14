import { Trans } from "@lingui/react/macro";

import { cn } from "@hypr/ui/lib/utils";
import type { BaseButtonProps } from "./types";

export function ResumeButton({ disabled, onClick }: BaseButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-20 h-9 rounded-full transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center text-sm font-medium",
        "bg-red-100 border-2 border-red-400 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed",
      )}
      style={{
        boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
      }}
    >
      <Trans>Resume</Trans>
    </button>
  );
}
