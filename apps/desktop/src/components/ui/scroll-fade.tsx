import { memo, type RefObject, useCallback, useEffect, useState } from "react";
import { useResizeObserver } from "usehooks-ts";

import { cn } from "@hypr/utils";

type ScrollDirection = "horizontal" | "vertical";

export function useScrollFade<T extends HTMLElement>(
  ref: RefObject<T | null>,
  direction: ScrollDirection = "vertical",
  deps: unknown[] = [],
) {
  const [state, setState] = useState({ atStart: true, atEnd: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    if (direction === "vertical") {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setState({
        atStart: scrollTop <= 1,
        atEnd: scrollTop + clientHeight >= scrollHeight - 1,
      });
    } else {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setState({
        atStart: scrollLeft <= 1,
        atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
      });
    }
  }, [ref, direction]);

  useResizeObserver({
    ref: ref as RefObject<T>,
    onResize: update,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    update();
    el.addEventListener("scroll", update);
    return () => el.removeEventListener("scroll", update);
  }, [ref, update, ...deps]);

  return state;
}

export const ScrollFadeOverlay = memo(function ScrollFadeOverlay({
  position,
}: {
  position: "top" | "bottom" | "left" | "right";
}) {
  const isHorizontal = position === "left" || position === "right";

  return (
    <div
      className={cn([
        "absolute z-20 pointer-events-none",
        isHorizontal ? ["top-0 h-full w-8"] : ["left-0 w-full h-8"],
        position === "top" &&
          "top-0 bg-gradient-to-b from-white to-transparent",
        position === "bottom" &&
          "bottom-0 bg-gradient-to-t from-white to-transparent",
        position === "left" &&
          "left-0 bg-gradient-to-r from-white to-transparent",
        position === "right" &&
          "right-0 bg-gradient-to-l from-white to-transparent",
      ])}
    />
  );
});
