import { dragAsWindow } from "@crabnebula/tauri-plugin-drag-as-window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useRef } from "react";

import { type Tab, tabToInput } from "../store/zustand/tabs";

interface UseDragAsWindowOptions {
  tab: Tab;
  onPopOut?: () => void;
}

export function useDragAsWindow({ tab, onPopOut }: UseDragAsWindowOptions) {
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent, element: HTMLElement | null) => {
      if (!dragStartPosRef.current || !element || isDraggingRef.current) {
        return;
      }

      const dx = Math.abs(e.clientX - dragStartPosRef.current.x);
      const dy = Math.abs(e.clientY - dragStartPosRef.current.y);
      const threshold = 20;

      if (dy > threshold && dy > dx) {
        isDraggingRef.current = true;

        dragAsWindow(element, async (payload) => {
          isDraggingRef.current = false;
          dragStartPosRef.current = null;

          const tabInput = tabToInput(tab);
          const windowLabel = `popout-${tab.type}-${Date.now()}`;

          const searchParams = new URLSearchParams();
          searchParams.set("tab", JSON.stringify(tabInput));

                    const newWindow = new WebviewWindow(windowLabel, {
                      x: Number(payload.cursorPos.x),
                      y: Number(payload.cursorPos.y),
            width: 800,
            height: 600,
            title: `Hyprnote - ${tab.type}`,
            url: `/?${searchParams.toString()}`,
            decorations: true,
            resizable: true,
            center: false,
          });

          newWindow.once("tauri://created", () => {
            onPopOut?.();
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

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
