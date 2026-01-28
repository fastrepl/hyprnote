import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { commands } from "../../types/tauri.gen";

export function useLeftSidebar() {
  const [expanded, setExpanded] = useState(true);
  const [showDevtool, setShowDevtool] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const toggleDevtool = useCallback(() => {
    setShowDevtool((prev) => !prev);
  }, []);

  const expandWithResize = useCallback(() => {
    commands.resizeWindowForSidebar();
    setExpanded(true);
  }, []);

  useHotkeys(
    "mod+\\",
    toggleExpanded,
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [toggleExpanded],
  );

  return {
    expanded,
    setExpanded,
    toggleExpanded,
    expandWithResize,
    showDevtool,
    setShowDevtool,
    toggleDevtool,
  };
}
