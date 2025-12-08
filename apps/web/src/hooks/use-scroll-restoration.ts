import { useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef } from "react";

const scrollPositions = new Map<string, number>();

function useIsomorphicLayoutEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList,
) {
  const isBrowser = typeof window !== "undefined";
  return (isBrowser ? useLayoutEffect : useEffect)(effect, deps);
}

export function useScrollRestoration(
  ref: React.RefObject<HTMLElement | null>,
  keyPrefix: string,
) {
  const { location } = useRouterState();
  const keyRef = useRef("");

  const key = `${keyPrefix}:${location.pathname}`;
  keyRef.current = key;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const saved = scrollPositions.get(keyRef.current) ?? 0;

    const id = window.requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.scrollTop = saved;
      }
    });

    const handleScroll = () => {
      if (!ref.current) return;
      scrollPositions.set(keyRef.current, ref.current.scrollTop);
    };

    el.addEventListener("scroll", handleScroll);
    return () => {
      window.cancelAnimationFrame(id);
      el.removeEventListener("scroll", handleScroll);
    };
  }, [key]);
}
