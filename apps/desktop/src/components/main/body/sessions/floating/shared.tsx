import { cn } from "@hypr/utils";

import { type ComponentProps, type ReactNode } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
export { ActionableTooltipContent } from "../shared";

export function FloatingButton({
  icon,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  disabled,
  tooltip,
  error,
  subtle,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  disabled?: boolean;
  error?: boolean;
  subtle?: boolean;
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
      className={cn([
        "border-2 rounded-full transition-all duration-200",
        error && "border-red-500",
        !error && "border-neutral-200 focus-within:border-stone-500",
        subtle && "opacity-40 hover:opacity-100",
      ])}
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
