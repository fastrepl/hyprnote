import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export function useLeftSidebar() {
  const [preferredExpanded, setPreferredExpanded] = useState(true);
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  const expanded = preferredExpanded && !autoCollapsed;
  const setExpanded = useCallback((value: boolean) => {
    setPreferredExpanded(value);
    setAutoCollapsed(false);
  }, []);
  const [locked, setLocked] = useState(false);

  const toggleExpanded = useCallback(() => {
    if (locked) return;
    setExpanded(!expanded);
  }, [expanded, locked, setExpanded]);

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
    preferredExpanded,
    setExpanded,
    setAutoCollapsed,
    locked,
    setLocked,
    toggleExpanded,
  };
}
