import { Button } from "@hypr/ui/components/ui/button";

import { type ReactNode } from "react";

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
      size="lg"
      className="rounded-lg"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {icon || (
        <div className="relative size-2">
          <div className="absolute inset-0 rounded-full bg-red-600"></div>
          <div className="absolute inset-0 rounded-full bg-red-300 animate-ping"></div>
        </div>
      )}
      {children}
    </Button>
  );
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
