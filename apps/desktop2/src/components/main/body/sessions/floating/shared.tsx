import { type ReactNode } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";

export function FloatingButton({
  icon,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <Button
      className={cn([
        "flex flex-row items-center justify-center gap-1",
        "text-white bg-black hover:bg-neutral-800",
        "px-4 py-2 rounded-lg shadow-lg",
        "min-w-[170px] h-10",
      ])}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {icon && <span className="flex items-center flex-shrink-0 pt-1">{icon}</span>}
      {children}
    </Button>
  );
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
