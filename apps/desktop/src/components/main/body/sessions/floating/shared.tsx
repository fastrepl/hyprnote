import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";

import { type ComponentProps, type ReactNode } from "react";

export function FloatingButton({
  icon,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  disabled,
  tooltip,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  disabled?: boolean;
  tooltip?: {
    content: ReactNode;
    side?: ComponentProps<typeof TooltipContent>["side"];
    align?: ComponentProps<typeof TooltipContent>["align"];
    delayDuration?: number;
  };
}) {
  const button = (
    <Button
      size="lg"
      className="rounded-lg disabled:opacity-100 disabled:bg-neutral-500"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
    >
      {icon}
      {children}
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip delayDuration={tooltip.delayDuration ?? 0}>
      <TooltipTrigger asChild>
        <span className="inline-block">{button}</span>
      </TooltipTrigger>
      <TooltipContent side={tooltip.side ?? "top"} align={tooltip.align}>
        {tooltip.content}
      </TooltipContent>
    </Tooltip>
  );
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
