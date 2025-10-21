import { commands as windowsCommands } from "@hypr/plugin-windows";
import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export function useSettings() {
  const openSettings = useCallback(() => {
    windowsCommands.windowShow({ type: "settings" });
  }, []);

  useHotkeys(
    "mod+,",
    openSettings,
    {
      preventDefault: true,
      splitKey: "|",
    },
    [openSettings],
  );

  return { openSettings };
}
