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
      const target = event.target as HTMLElement;
      const isInput = target.tagName === "INPUT"
        || target.tagName === "TEXTAREA"
        || target.tagName === "SELECT";
      const isContentEditable = target.isContentEditable;

      if (isInput || isContentEditable) {
        return;
      }

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
