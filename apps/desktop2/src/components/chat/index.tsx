import { motion } from "motion/react";
import { Resizable } from "re-resizable";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/ui/lib/utils";
import { useAutoCloser } from "../../hooks/useAutoCloser";

import { ChatTrigger } from "./trigger";
import { ChatView } from "./view";

export function ChatFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);

  useAutoCloser(() => setIsOpen(false), { esc: isOpen, outside: false });
  useHotkeys("meta+j", () => setIsOpen((prev) => !prev));

  if (!isOpen) {
    return <ChatTrigger onClick={() => setIsOpen(true)} />;
  }

  return (
    <ResizableAndDraggableContainer>
      <ChatView onClose={() => setIsOpen(false)} />
    </ResizableAndDraggableContainer>
  );
}

function ResizableAndDraggableContainer({
  children,
}: {
  children: ReactNode;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" />
      <motion.div
        drag={!isResizing}
        dragMomentum
        dragElastic={0}
        dragConstraints={constraintsRef}
        dragTransition={{ power: 0.2, timeConstant: 200 }}
        initial={{ x: window.innerWidth - 440 - 16, y: window.innerHeight - 600 - 16 }}
        className="fixed z-40 pointer-events-auto"
      >
        <Resizable
          defaultSize={{ width: 440, height: 600 }}
          minWidth={300}
          minHeight={400}
          maxWidth={window.innerWidth - 32}
          maxHeight={window.innerHeight - 32}
          bounds="window"
          onResizeStart={() => setIsResizing(true)}
          onResizeStop={() => setIsResizing(false)}
          className={cn(
            "bg-white rounded-2xl shadow-2xl",
            "border border-neutral-200",
            "flex flex-col",
          )}
          handleClasses={{
            top: "hover:bg-blue-500/20 transition-colors",
            right: "hover:bg-blue-500/20 transition-colors",
            bottom: "hover:bg-blue-500/20 transition-colors",
            left: "hover:bg-blue-500/20 transition-colors",
            topRight: "hover:bg-blue-500/20 transition-colors",
            bottomRight: "hover:bg-blue-500/20 transition-colors",
            bottomLeft: "hover:bg-blue-500/20 transition-colors",
            topLeft: "hover:bg-blue-500/20 transition-colors",
          }}
          handleStyles={{
            top: { height: "4px", top: 0 },
            right: { width: "4px", right: 0 },
            bottom: { height: "4px", bottom: 0 },
            left: { width: "4px", left: 0 },
            topRight: { width: "12px", height: "12px", top: 0, right: 0 },
            bottomRight: { width: "12px", height: "12px", bottom: 0, right: 0 },
            bottomLeft: { width: "12px", height: "12px", bottom: 0, left: 0 },
            topLeft: { width: "12px", height: "12px", top: 0, left: 0 },
          }}
        >
          {children}
        </Resizable>
      </motion.div>
    </>
  );
}
