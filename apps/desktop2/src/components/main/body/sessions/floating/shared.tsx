import { type ReactNode } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";

interface FloatingButtonProps {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  showIndicator?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function FloatingButton({
  icon,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  showIndicator = false,
  className,
  style,
}: FloatingButtonProps) {
  return (
    <Button
      className={cn([
        "relative",
        "bg-black hover:bg-neutral-800",
        "text-white",
        "px-4 py-2 rounded-lg shadow-lg",
        "min-w-[170px] h-10",
        "justify-center",
        className,
      ])}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {showIndicator && <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />}
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </Button>
  );
}
