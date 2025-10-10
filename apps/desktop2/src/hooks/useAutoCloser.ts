import { useCallback, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export function useAutoCloser(onClose: () => void, enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleClose = useCallback(() => {
    if (enabled) {
      onClose();
    }
  }, [onClose, enabled]);

  useHotkeys("esc", handleClose, { enabled }, [handleClose]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClose, enabled]);

  return ref;
}
