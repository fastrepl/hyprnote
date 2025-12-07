import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export function useLeftSidebar() {
  const [expanded, setExpanded] = useState(true);
  const [showDevtool, setShowDevtool] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const toggleDevtool = useCallback(() => {
    setShowDevtool((prev) => !prev);
  }, []);

  useHotkeys(
    "mod+l",
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
    showDevtool,
    setShowDevtool,
    toggleDevtool,
  };
}
