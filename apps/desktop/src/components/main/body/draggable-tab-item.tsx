import { useCallback, useRef } from "react";
import { dragAsWindow } from "@crabnebula/tauri-plugin-drag-as-window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

import { tabToInput, type Tab } from "../../../store/zustand/tabs";

interface DraggableTabItemProps {
  tab: Tab;
  onPopOut: () => void;
  children: React.ReactNode;
}

export function DraggableTabItem({
  tab,
  onPopOut,
  children,
}: DraggableTabItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (
        !dragStartPosRef.current ||
        !containerRef.current ||
        isDraggingRef.current
      ) {
        return;
      }

      const dx = Math.abs(e.clientX - dragStartPosRef.current.x);
      const dy = Math.abs(e.clientY - dragStartPosRef.current.y);
      const threshold = 30;

      if (dy > threshold && dy > dx * 1.5) {
        isDraggingRef.current = true;

        dragAsWindow(containerRef.current, async (payload) => {
          isDraggingRef.current = false;
          dragStartPosRef.current = null;

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

          newWindow.once("tauri://error", (e) => {
            console.error("Failed to create pop-out window:", e);
          });
        });
      }
    },
    [tab, onPopOut],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) {
      dragStartPosRef.current = null;
    }
  }, []);

  const handlePointerCancel = useCallback(() => {
    isDraggingRef.current = false;
    dragStartPosRef.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="h-full"
    >
      {children}
    </div>
  );
}
