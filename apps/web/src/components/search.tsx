import { useEffect, useRef } from "react";

export function Search() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPagefind = async () => {
      if (!containerRef.current) return;

      try {
        const pagefindUI = await import("/pagefind/pagefind-ui.js");
        new pagefindUI.PagefindUI({
          element: containerRef.current,
          showSubResults: true,
          showImages: false,
        });
      } catch {
        console.debug("Pagefind UI not available yet");
      }
    };

    loadPagefind();
  }, []);

  return <div ref={containerRef} />;
}
