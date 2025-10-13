import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export function useLeftSidebar() {
  const [expanded, setExpanded] = useState(true);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  useHotkeys(
    "mod+l",
    (event) => {
      event.preventDefault();
      toggleExpanded();
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  return {
    expanded,
    setExpanded,
    toggleExpanded,
  };
}
