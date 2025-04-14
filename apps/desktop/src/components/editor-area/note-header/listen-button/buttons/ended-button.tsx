import { Trans } from "@lingui/react/macro";
import { useState } from "react";

import { cn } from "@hypr/ui/lib/utils";
import type { BaseButtonProps } from "./types";

export function EndedButton({ disabled, onClick }: BaseButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-16 h-9 rounded-full transition-all duration-400 hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center text-xs font-medium",
        "bg-neutral-200 border-2 border-neutral-400 text-neutral-600 opacity-30",
        !disabled
          && "hover:opacity-100 hover:bg-red-100 hover:text-red-600 hover:border-red-400",
      )}
      style={{ boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset" }}
    >
      <Trans>{isHovered ? "Resume" : "Ended"}</Trans>
    </button>
  );
}
