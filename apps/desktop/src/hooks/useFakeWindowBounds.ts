import { type RefObject, useLayoutEffect, useRef } from "react";

import { commands } from "@hypr/plugin-overlay";

export function useFakeWindowBounds(
  name: string,
  ref: RefObject<HTMLElement | null>,
) {
  const rafIdRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateBounds = () => {
      const rect = element.getBoundingClientRect();
      commands.setFakeWindowBounds(name, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    };

    const throttledUpdate = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        updateBounds();
        rafIdRef.current = null;
      });
    };

    const observer = new ResizeObserver(throttledUpdate);
    observer.observe(element);

    updateBounds();

    return () => {
      observer.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      commands.removeFakeWindow(name);
    };
  }, [name, ref]);
}
