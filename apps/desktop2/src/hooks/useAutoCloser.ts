import { useCallback, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export function useAutoCloser(onClose: () => void, {
  esc = true,
  outside = true,
}: {
  esc?: boolean;
  outside?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useHotkeys("esc", handleClose, { enabled: esc }, [handleClose]);

  useEffect(() => {
    if (!outside) {
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
  }, [handleClose, outside]);

  return ref;
}
