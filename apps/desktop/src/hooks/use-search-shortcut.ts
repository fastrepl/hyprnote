import { useEffect } from "react";
import { useSearchStore } from "../stores/use-search-store";

export function useSearchShortcut() {
  const { isOpen, toggle } = useSearchStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  return { open: isOpen, setOpen: useSearchStore((state) => state.close) };
}
