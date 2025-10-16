import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@hypr/ui/components/ui/context-menu";
import { type MouseEvent, type ReactNode, useCallback } from "react";

interface InteractiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  onCmdClick?: () => void;
  contextMenu?: ReactNode;
  className?: string;
  disabled?: boolean;
  asChild?: boolean;
}

export function InteractiveButton({
  children,
  onClick,
  onCmdClick,
  contextMenu,
  className,
  disabled,
  asChild = false,
}: InteractiveButtonProps) {
  const handleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
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

  const Element = asChild ? "div" : "button";

  if (!contextMenu) {
    return (
      <Element onClick={handleClick} className={className} disabled={!asChild ? disabled : undefined}>
        {children}
      </Element>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild={asChild}>
        <Element onClick={handleClick} className={className} disabled={!asChild ? disabled : undefined}>
          {children}
        </Element>
      </ContextMenuTrigger>
      <ContextMenuContent>{contextMenu}</ContextMenuContent>
    </ContextMenu>
  );
}
