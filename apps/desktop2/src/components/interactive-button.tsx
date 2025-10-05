import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@hypr/ui/components/ui/context-menu";
import { type MouseEvent, type ReactNode, useCallback } from "react";

interface InteractiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  onCmdClick?: () => void;
  contextMenu?: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function InteractiveButton({
  children,
  onClick,
  onCmdClick,
  contextMenu,
  className,
  disabled,
}: InteractiveButtonProps) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        onCmdClick?.();
      } else {
        onClick?.();
      }
    },
    [onClick, onCmdClick, disabled],
  );

  if (!contextMenu) {
    return (
      <button onClick={handleClick} className={className} disabled={disabled}>
        {children}
      </button>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button onClick={handleClick} className={className} disabled={disabled}>
          {children}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>{contextMenu}</ContextMenuContent>
    </ContextMenu>
  );
}
