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

function getTabPillElement(
  container: HTMLDivElement | null,
): HTMLElement | null {
  if (!container) return null;
  return container.querySelector("[data-tab-pill]") as HTMLElement | null;
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      hasStartedReorderRef.current = false;
      pointerDownEventRef.current = e.nativeEvent;

      const dragElement =
        getTabPillElement(containerRef.current) || containerRef.current;
      if (e.altKey && dragElement) {
        isDraggingRef.current = true;
        dragAsWindow(dragElement, async (payload) => {
          const tabInput = tabToInput(tab);
          const windowLabel = `popout-${tab.type}-${Date.now()}`;

          const searchParams = new URLSearchParams();
          searchParams.set("tab", JSON.stringify(tabInput));

          const newWindow = new WebviewWindow(windowLabel, {
            x: Number(payload.cursorPos.x),
            y: Number(payload.cursorPos.y),
            width: 800,
            height: 600,
            title: `Hyprnote`,
            url: `/app/popout?${searchParams.toString()}`,
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
        return;
      }

      if (containerRef.current) {
        containerRef.current.setPointerCapture(e.pointerId);
      }
    },
    [tab, onPopOut],
  );

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

      if (dx > threshold && dx > dy) {
        hasStartedReorderRef.current = true;
        if (
          containerRef.current &&
          containerRef.current.hasPointerCapture(e.pointerId)
        ) {
          containerRef.current.releasePointerCapture(e.pointerId);
        }
        if (pointerDownEventRef.current) {
          dragControls.start(pointerDownEventRef.current);
        }
        return;
      }

      if (dy > threshold && dy > dx) {
        isDraggingRef.current = true;
        if (
          containerRef.current &&
          containerRef.current.hasPointerCapture(e.pointerId)
        ) {
          containerRef.current.releasePointerCapture(e.pointerId);
        }

        const dragElement =
          getTabPillElement(containerRef.current) || containerRef.current;
        if (!dragElement) return;

        dragAsWindow(dragElement, async (payload) => {
          const tabInput = tabToInput(tab);
          const windowLabel = `popout-${tab.type}-${Date.now()}`;

          const searchParams = new URLSearchParams();
          searchParams.set("tab", JSON.stringify(tabInput));

          const newWindow = new WebviewWindow(windowLabel, {
            x: Number(payload.cursorPos.x),
            y: Number(payload.cursorPos.y),
            width: 800,
            height: 600,
            title: `Hyprnote`,
            url: `/app/popout?${searchParams.toString()}`,
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
      data-tauri-drag-region="false"
      style={{
        position: "relative",
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
