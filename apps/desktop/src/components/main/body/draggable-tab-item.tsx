import { dragAsWindow } from "@crabnebula/tauri-plugin-drag-as-window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { type DragControls, Reorder, useDragControls } from "motion/react";
import { useCallback, useRef } from "react";

import {
  type Tab,
  tabToInput,
  uniqueIdfromTab,
} from "../../../store/zustand/tabs";

interface UseDraggableTabResult {
  dragControls: DragControls;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  handlePointerCancel: (e: React.PointerEvent) => void;
}

export function useDraggableTab(
  tab: Tab,
  onPopOut: () => void,
): UseDraggableTabResult {
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasStartedReorderRef = useRef(false);
  const pointerDownEventRef = useRef<PointerEvent | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    hasStartedReorderRef.current = false;
    pointerDownEventRef.current = e.nativeEvent;

    // Capture pointer to ensure we receive move events even when pointer leaves element
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (
        !dragStartPosRef.current ||
        !containerRef.current ||
        isDraggingRef.current ||
        hasStartedReorderRef.current
      ) {
        return;
      }

      const dx = Math.abs(e.clientX - dragStartPosRef.current.x);
      const dy = Math.abs(e.clientY - dragStartPosRef.current.y);
      const threshold = 15;

      // If horizontal movement is dominant, start reorder drag
      if (dx > threshold && dx > dy) {
        hasStartedReorderRef.current = true;
        // Release pointer capture before starting Framer Motion drag
        if (containerRef.current) {
          containerRef.current.releasePointerCapture(e.pointerId);
        }
        // Use the original pointerdown event for dragControls.start
        if (pointerDownEventRef.current) {
          dragControls.start(pointerDownEventRef.current);
        }
        return;
      }

      // If vertical movement is dominant, start pop-out drag
      if (dy > threshold && dy > dx) {
        isDraggingRef.current = true;
        // Release pointer capture before starting native drag
        if (containerRef.current) {
          containerRef.current.releasePointerCapture(e.pointerId);
        }

        dragAsWindow(containerRef.current, async (payload) => {
          const tabInput = tabToInput(tab);
          const windowLabel = `popout-${tab.type}-${Date.now()}`;

          const searchParams = new URLSearchParams();
          searchParams.set("popout", "true");
          searchParams.set("tab", JSON.stringify(tabInput));

          const newWindow = new WebviewWindow(windowLabel, {
            x: Number(payload.cursorPos.x),
            y: Number(payload.cursorPos.y),
            width: 800,
            height: 600,
            title: `Hyprnote`,
            url: `/?${searchParams.toString()}`,
            decorations: true,
            resizable: true,
            center: false,
          });

          newWindow.once("tauri://created", () => {
            onPopOut();
          });

          newWindow.once("tauri://error", (err) => {
            console.error("Failed to create pop-out window:", err);
          });
        })
          .catch((err) => {
            console.error("dragAsWindow failed:", err);
          })
          .finally(() => {
            isDraggingRef.current = false;
            dragStartPosRef.current = null;
            pointerDownEventRef.current = null;
          });
      }
    },
    [tab, onPopOut, dragControls],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Release pointer capture on pointer up
    if (
      containerRef.current &&
      containerRef.current.hasPointerCapture(e.pointerId)
    ) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
    dragStartPosRef.current = null;
    hasStartedReorderRef.current = false;
    pointerDownEventRef.current = null;
  }, []);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    // Release pointer capture on cancel
    if (
      containerRef.current &&
      containerRef.current.hasPointerCapture(e.pointerId)
    ) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
    isDraggingRef.current = false;
    dragStartPosRef.current = null;
    hasStartedReorderRef.current = false;
    pointerDownEventRef.current = null;
  }, []);

  return {
    dragControls,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}

interface DraggableReorderItemProps {
  tab: Tab;
  onPopOut: () => void;
  setTabRef: (tab: Tab, el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}

export function DraggableReorderItem({
  tab,
  onPopOut,
  setTabRef,
  children,
}: DraggableReorderItemProps) {
  const {
    dragControls,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = useDraggableTab(tab, onPopOut);

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      containerRef.current = el;
      setTabRef(tab, el);
    },
    [containerRef, setTabRef, tab],
  );

  return (
    <Reorder.Item
      key={uniqueIdfromTab(tab)}
      value={tab}
      as="div"
      ref={setRefs}
      style={{
        position: "relative",
        // Prevent Tauri's drag region from blocking pointer events on macOS
        // @ts-expect-error - WebKit-specific CSS property
        WebkitAppRegion: "no-drag",
      }}
      className="h-full z-10"
      layoutScroll
      dragListener={false}
      dragControls={dragControls}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {children}
    </Reorder.Item>
  );
}
