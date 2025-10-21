import { useEffect } from "react";

interface UseSearchShortcutProps {
  onFocusSearch: () => void;
}

export function useSearchShortcut({ onFocusSearch }: UseSearchShortcutProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        onFocusSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onFocusSearch]);

  return { focusSearch: onFocusSearch };
}
