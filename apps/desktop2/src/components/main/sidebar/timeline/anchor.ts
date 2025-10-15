import { useCallback, useEffect, useRef, useState } from "react";

export function useAnchor({
  isAnchorActive,
  autoScrollOnMount,
}: {
  isAnchorActive: boolean;
  autoScrollOnMount?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnchorVisible, setIsAnchorVisible] = useState(true);
  const [isScrolledPastAnchor, setIsScrolledPastAnchor] = useState(false);
  const [anchorNode, setAnchorNode] = useState<HTMLDivElement | null>(null);

  const registerAnchor = useCallback((node: HTMLDivElement | null) => {
    setAnchorNode(previousNode => (previousNode === node ? previousNode : node));
  }, []);

  const scrollToAnchor = useCallback(() => {
    const container = containerRef.current;
    if (!container || !anchorNode) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const anchorRect = anchorNode.getBoundingClientRect();
    const anchorCenter = anchorRect.top - containerRect.top + container.scrollTop + (anchorRect.height / 2);
    const targetScrollTop = Math.max(anchorCenter - (container.clientHeight / 2), 0);
    container.scrollTo({ top: targetScrollTop, behavior: "smooth" });
  }, [anchorNode]);

  useEffect(() => {
    if (!isAnchorActive || !autoScrollOnMount) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToAnchor();
    });
  }, [autoScrollOnMount, isAnchorActive, scrollToAnchor]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !anchorNode) {
      setIsAnchorVisible(true);
      setIsScrolledPastAnchor(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const containerRect = container.getBoundingClientRect();
        const anchorRect = anchorNode.getBoundingClientRect();

        setIsAnchorVisible(entry.isIntersecting);
        setIsScrolledPastAnchor(anchorRect.top < containerRect.top);
      },
      { root: container, threshold: 0.1 },
    );

    observer.observe(anchorNode);

    return () => observer.disconnect();
  }, [anchorNode]);

  return {
    containerRef,
    isAnchorVisible,
    isScrolledPastAnchor,
    scrollToAnchor,
    isAnchorActive,
    registerAnchor,
  };
}
