import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useHotkeys } from "react-hotkeys-hook";

import { useTabs as useTabsStore } from "../../store/zustand/tabs";

export function useTabsShortcuts(onNewTab: (closeCurrentFirst: boolean) => void) {
  const { tabs, currentTab, close, select } = useTabsStore();

  useHotkeys(
    "mod+w",
    async () => {
      if (currentTab && tabs.length > 1) {
        close(currentTab);
      } else {
        const appWindow = getCurrentWebviewWindow();
        await appWindow.close();
      }
    },
    { preventDefault: true },
    [tabs, currentTab, close],
  );

  useHotkeys("mod+n", () => onNewTab(true), { preventDefault: true }, [onNewTab]);
  useHotkeys("mod+t", () => onNewTab(false), { preventDefault: true }, [onNewTab]);

  useHotkeys(
    "mod+1, mod+2, mod+3, mod+4, mod+5, mod+6, mod+7, mod+8, mod+9",
    (event) => {
      const key = event.key;
      const targetIndex = key === "9" ? tabs.length - 1 : Number.parseInt(key, 10) - 1;
      const target = tabs[targetIndex];
      if (target) {
        select(target);
      }
    },
    { preventDefault: true },
    [tabs, select],
  );

  return {};
}
