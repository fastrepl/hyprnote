import { cn } from "@hypr/utils";

import { flip, FloatingPortal, offset, shift, useFloating } from "@floating-ui/react";
import { useCallback, useEffect, useState } from "react";

export function SelectionMenu({
  containerRef,
  onAction,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  onAction?: (action: string, selectedText: string) => void;
}) {
  const {
    isVisible,
    selectedText,
    hide,
    refs,
    floatingStyles,
  } = useSelectionMenuState({ containerRef });

  const handleAction = useCallback(
    (action: string) => {
      onAction?.(action, selectedText);
      hide();
      window.getSelection()?.removeAllRanges();
    },
    [hide, onAction, selectedText],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={{
          ...floatingStyles,
          zIndex: 50,
        }}
        className={cn([
          "pointer-events-auto",
          "bg-white shadow-lg rounded-md border border-neutral-200 px-2 py-1",
          "text-xs font-medium text-neutral-700",
        ])}
      >
        <button
          onClick={() => handleAction("copy")}
          className="hover:text-neutral-900 transition-colors"
        >
          Copy "{selectedText.slice(0, 20)}
          {selectedText.length > 20 ? "..." : ""}"
        </button>
      </div>
    </FloatingPortal>
  );
}

function useSelectionListener({
  containerRef,
  show,
  hide,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  show: (text: string, range: Range) => void;
  hide: () => void;
}) {
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        hide();
        return;
      }

      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();

      if (!text) {
        hide();
        return;
      }

      const container = containerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) {
        hide();
        return;
      }

      show(text, range);
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [containerRef, hide, show]);
}

function useScrollUpdate({
  containerRef,
  isVisible,
  update,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  isVisible: boolean;
  update: () => void;
}) {
  useEffect(() => {
    if (!isVisible || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const handleScroll = () => {
      update();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [containerRef, isVisible, update]);
}

function useSelectionMenuState({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  const { refs, floatingStyles, update } = useFloating<HTMLElement>({
    open: isVisible,
    placement: "bottom",
    strategy: "fixed",
    transform: false,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
    ],
  });

  const show = useCallback(
    (text: string, range: Range) => {
      setSelectedText(text);
      setIsVisible(true);
      refs.setPositionReference({
        getBoundingClientRect: () => range.getBoundingClientRect(),
      });
    },
    [refs],
  );

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  useSelectionListener({ containerRef, show, hide });
  useScrollUpdate({ containerRef, isVisible, update });

  return { isVisible, selectedText, hide, refs, floatingStyles };
}
