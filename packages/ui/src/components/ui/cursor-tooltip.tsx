import React, { ReactNode, useCallback, useState } from "react";
import ReactDOM from "react-dom";

interface CursorFollowTooltipProps {
  children: React.ReactElement;
  tooltipContent: ReactNode;
  offset?: { x: number; y: number };
  disabled?: boolean;
}

const CursorFollowTooltip: React.FC<CursorFollowTooltipProps> = ({
  children,
  tooltipContent,
  offset = { x: 15, y: 15 }, // Default offset from cursor
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setPosition({ x: e.clientX + offset.x, y: e.clientY + offset.y });
  }, [offset]);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) {
      setVisible(true);
    }
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setVisible(false);
  }, []);

  // Check if document is defined (for SSR compatibility)
  if (typeof document === "undefined") {
    return children;
  }

  const childWithMouseEvents = React.cloneElement(children, {
    ...children.props, // Preserve existing props
    onMouseMove: (e: React.MouseEvent) => {
      handleMouseMove(e);
      if (children.props.onMouseMove) {
        children.props.onMouseMove(e);
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      if (children.props.onMouseEnter) {
        children.props.onMouseEnter(e);
      }
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      if (children.props.onMouseLeave) {
        children.props.onMouseLeave(e);
      }
    },
  });

  return (
    <>
      {childWithMouseEvents}
      {visible && !disabled && ReactDOM.createPortal(
        <div
          style={{
            position: "fixed",
            top: position.y,
            left: position.x,
            zIndex: 9999,
            padding: "4px 8px",
            background: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
            borderRadius: "var(--radius)",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 2px 10px hsla(var(--card-foreground), 0.1)",
            pointerEvents: "none",
            fontSize: "0.875rem",
            lineHeight: "1.25rem",
            maxWidth: "160px",
            textAlign: "left",
          }}
        >
          {tooltipContent}
        </div>,
        document.body,
      )}
    </>
  );
};

export default CursorFollowTooltip;
