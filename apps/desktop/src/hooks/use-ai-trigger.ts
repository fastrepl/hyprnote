import { useEffect, useState } from "react";

export interface UseAITriggerOptions {
  onOpen?: () => void;
}

export function useAITrigger({ onOpen }: UseAITriggerOptions = {}) {
  const [isDynamic, setIsDynamic] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsDynamic(true);

      const timeout = setTimeout(() => {
        setIsDynamic(false);
      }, 1625);

      return () => clearTimeout(timeout);
    }, 6625);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // mod+J to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // esc to close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    onOpen?.();
  };

  return {
    isDynamic,
    isOpen,
    setIsOpen,
    handleOpen,
  };
}
