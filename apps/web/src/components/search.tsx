import { useEffect, useRef } from "react";

export function Search() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let pagefindInstance: { destroy?: () => void } | null = null;

    const loadPagefind = async () => {
      if (!containerRef.current) return;

      const linkId = "pagefind-ui-css";
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = "/pagefind/pagefind-ui.css";
        document.head.appendChild(link);
      }

      try {
        const pagefindUI = await import("/pagefind/pagefind-ui.js");
        pagefindInstance = new pagefindUI.PagefindUI({
          element: containerRef.current,
          showSubResults: true,
          showImages: false,
        });
      } catch {
        console.debug("Pagefind UI not available yet");
      }
    };

    loadPagefind();

    return () => {
      if (pagefindInstance?.destroy) {
        pagefindInstance.destroy();
      }
    };
  }, []);

  return <div ref={containerRef} />;
}
