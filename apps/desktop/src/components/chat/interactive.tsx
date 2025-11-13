import { cn } from "@hypr/utils";

import { Resizable } from "re-resizable";
import { type ReactNode, useState } from "react";
import { createPortal } from "react-dom";

export function InteractiveContainer(
  {
    children,
    width,
    height,
  }: {
    children: ReactNode;
    width: number;
    height: number;
  },
) {
  const [isResizing, setIsResizing] = useState(false);

  return createPortal(
    <div
      className="fixed z-[100]"
      style={{ right: 16, bottom: 16 }}
    >
      <Resizable
        defaultSize={{ width, height }}
        minWidth={width / 2}
        minHeight={height / 2}
        bounds="window"
        enable={{
          top: false,
          right: true,
          bottom: true,
          left: true,
          topRight: false,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true,
        }}
        className={cn([
          "bg-white rounded-2xl shadow-2xl",
          "border border-neutral-200",
          "flex flex-col",
          !isResizing && "transition-all duration-200",
        ])}
        handleClasses={{
          right: "hover:bg-blue-500/20 transition-colors",
          bottom: "hover:bg-blue-500/20 transition-colors",
          left: "hover:bg-blue-500/20 transition-colors",
          bottomRight: "hover:bg-blue-500/20 transition-colors",
          bottomLeft: "hover:bg-blue-500/20 transition-colors",
          topLeft: "hover:bg-blue-500/20 transition-colors",
        }}
        handleStyles={{
          right: { width: "4px", right: 0 },
          bottom: { height: "4px", bottom: 0 },
          left: { width: "4px", left: 0 },
          bottomRight: { width: "12px", height: "12px", bottom: 0, right: 0 },
          bottomLeft: { width: "12px", height: "12px", bottom: 0, left: 0 },
          topLeft: { width: "12px", height: "12px", top: 0, left: 0 },
        }}
        onResizeStart={() => setIsResizing(true)}
        onResizeStop={() => setIsResizing(false)}
      >
        {children}
      </Resizable>
    </div>,
    document.body,
  );
}
