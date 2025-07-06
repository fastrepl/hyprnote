import { useQueryClient } from "@tanstack/react-query";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useRef } from "react";

export function useWindowFocusOTA() {
  const queryClient = useQueryClient();
  const lastCheckTimeMs = useRef(0);

  useEffect(() => {
    let cleanupFocus: (() => void) | null = null;

    const checkForUpdates = () => {
      const nowMs = Date.now();
      const timeSinceLastCheck = nowMs - lastCheckTimeMs.current;

      if (timeSinceLastCheck < 30000) {
        return;
      }

      lastCheckTimeMs.current = nowMs;

      queryClient.invalidateQueries({ queryKey: ["check-for-update"] });
      queryClient.invalidateQueries({ queryKey: ["app-in-applications-folder"] });
    };

    const window = getCurrentWebviewWindow();
    window.onFocusChanged(({ payload: hasFocus }) => {
      if (hasFocus) {
        checkForUpdates();
      }
    }).then(unlisten => {
      cleanupFocus = unlisten;
    }).catch(() => {});

    return () => {
      if (cleanupFocus) {
        cleanupFocus();
      }
    };
  }, [queryClient]);
}
