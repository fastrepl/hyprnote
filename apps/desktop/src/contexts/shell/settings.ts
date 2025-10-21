import { commands as windowsCommands } from "@hypr/plugin-windows";

import { useCallback, useEffect } from "react";

export function useSettings() {
  const openSettings = useCallback(() => {
    windowsCommands.windowShow({ type: "settings" });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        openSettings();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSettings]);

  return { openSettings };
}
