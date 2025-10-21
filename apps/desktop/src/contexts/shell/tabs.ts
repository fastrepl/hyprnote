import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

import { useTabs as useTabsStore } from "../../store/zustand/tabs";

export function useTabsShortcuts(onNewTab: (closeCurrentFirst: boolean) => void) {
  const { tabs, currentTab, close, select } = useTabsStore();

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && event.key === "w") {
        event.preventDefault();
        if (currentTab && tabs.length > 1) {
          close(currentTab);
        } else {
          const appWindow = getCurrentWebviewWindow();
          await appWindow.close();
        }
        return;
      }

      if (isMod && (event.key === "n" || event.key === "t")) {
        event.preventDefault();
        onNewTab(event.key === "n");
        return;
      }

      if (isMod && event.key >= "1" && event.key <= "9") {
        const targetIndex = event.key === "9"
          ? tabs.length - 1
          : Number.parseInt(event.key, 10) - 1;

        const target = tabs[targetIndex];
        if (target) {
          event.preventDefault();
          select(target);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tabs, currentTab, close, select, onNewTab]);

  return {};
}
