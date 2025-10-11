import { motion, type PanInfo } from "motion/react";
import { Resizable } from "re-resizable";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

import { cn } from "@hypr/ui/lib/utils";

const EDGE_THRESHOLD = 30;
const PUSH_DURATION = 600;
const MOVEMENT_TOLERANCE = 2;

export function InteractiveContainer(
  {
    children,
    onPopOut,
    width,
    height,
  }: {
    children: ReactNode;
    onPopOut: () => void;
    width: number;
    height: number;
  },
) {
  const [isResizing, setIsResizing] = useState(false);
  const [isPushingEdge, setIsPushingEdge] = useState(false);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const pushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef({ x: 0, y: 0 });

  const clearPushTimeout = useCallback(() => {
    if (pushTimeoutRef.current) {
      clearTimeout(pushTimeoutRef.current);
      pushTimeoutRef.current = null;
    }
    setIsPushingEdge(false);
  }, []);

  const handleDrag = useCallback(
    (_event: unknown, info: PanInfo) => {
      const { x, y } = info.point;
      const { innerWidth, innerHeight } = window;

      const atRightEdge = x + width > innerWidth - EDGE_THRESHOLD;
      const atLeftEdge = x < EDGE_THRESHOLD;
      const atTopEdge = y < EDGE_THRESHOLD;
      const atBottomEdge = y + height > innerHeight - EDGE_THRESHOLD;

      const atAnyEdge = atRightEdge || atLeftEdge || atTopEdge || atBottomEdge;

      if (atAnyEdge) {
        const dx = x - lastPositionRef.current.x;
        const dy = y - lastPositionRef.current.y;
        const stillPushing = (atRightEdge && dx > 0)
          || (atLeftEdge && dx < 0)
          || (atTopEdge && dy < 0)
          || (atBottomEdge && dy > 0);

        if (stillPushing || Math.abs(dx) < MOVEMENT_TOLERANCE) {
          setIsPushingEdge(true);

          if (!pushTimeoutRef.current) {
            pushTimeoutRef.current = setTimeout(() => {
              onPopOut();
              clearPushTimeout();
            }, PUSH_DURATION);
          }
        } else {
          clearPushTimeout();
        }
      } else {
        clearPushTimeout();
      }

      lastPositionRef.current = { x, y };
    },
    [onPopOut, clearPushTimeout],
  );

  const handleDragEnd = useCallback(() => {
    clearPushTimeout();
  }, [clearPushTimeout]);

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" />
      <motion.div
        drag={!isResizing}
        dragMomentum
        dragElastic={0}
        dragConstraints={constraintsRef}
        dragTransition={{ power: 0.2, timeConstant: 200 }}
        initial={{ x: window.innerWidth - width - 16, y: window.innerHeight - height - 16 }}
        className="fixed z-40 pointer-events-auto"
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        <Resizable
          defaultSize={{ width: width, height: height }}
          minWidth={300}
          minHeight={400}
          maxWidth={window.innerWidth - 32}
          maxHeight={window.innerHeight - 32}
          bounds="window"
          onResizeStart={() => setIsResizing(true)}
          onResizeStop={() => setIsResizing(false)}
          className={cn([
            "bg-white rounded-2xl shadow-2xl",
            "border border-neutral-200",
            "flex flex-col transition-all duration-200",
            isPushingEdge && "ring-2 ring-blue-400 ring-opacity-60 shadow-blue-500/50",
          ])}
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
