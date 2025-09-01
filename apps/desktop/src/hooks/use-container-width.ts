import { useEffect, useState } from "react";

export function useContainerWidth(ref: React.RefObject<HTMLElement>) {
  const [width, setWidth] = useState(0);
  const [debouncedWidth, setDebouncedWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedWidth(width);
    }, 50);

    return () => clearTimeout(timer);
  }, [width]);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(element);
    setWidth(element.getBoundingClientRect().width);

    return () => resizeObserver.disconnect();
  }, [ref]);

  return debouncedWidth;
}
