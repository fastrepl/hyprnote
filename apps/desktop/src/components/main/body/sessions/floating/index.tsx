import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@hypr/utils";

import { useShell } from "../../../../../contexts/shell";
import type { Tab } from "../../../../../store/zustand/tabs/schema";
import { useCaretPosition } from "../caret-position-context";
import { useCurrentNoteTab, useHasTranscript } from "../shared";
import { ListenButton } from "./listen";

const SIDEBAR_WIDTH = 280;
const LAYOUT_PADDING = 4;

export function FloatingActionButton({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const currentTab = useCurrentNoteTab(tab);
  const hasTranscript = useHasTranscript(tab.id);

  if (!(currentTab.type === "raw" && !hasTranscript)) {
    return null;
  }

  return (
    <FloatingButtonContainer>
      <ListenButton tab={tab} />
    </FloatingButtonContainer>
  );
}

function FloatingButtonContainer({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const caretPosition = useCaretPosition();
  const { leftsidebar, chat } = useShell();
  const isCaretNearBottom = caretPosition?.isCaretNearBottom ?? false;
  const [chatPanelWidth, setChatPanelWidth] = useState(0);
  const [isMouseNearButton, setIsMouseNearButton] = useState(false);

  const isChatPanelOpen = chat.mode === "RightPanelOpen";

  useEffect(() => {
    if (!isChatPanelOpen) {
      setChatPanelWidth(0);
      return;
    }

    const updateChatWidth = () => {
      const chatPanel = document.querySelector("[data-panel-id]");
      if (chatPanel) {
        const panels = document.querySelectorAll("[data-panel-id]");
        const lastPanel = panels[panels.length - 1];
        if (lastPanel) {
          setChatPanelWidth(lastPanel.getBoundingClientRect().width);
        }
      }
    };

    updateChatWidth();
    window.addEventListener("resize", updateChatWidth);

    const observer = new MutationObserver(updateChatWidth);
    observer.observe(document.body, { subtree: true, attributes: true });

    return () => {
      window.removeEventListener("resize", updateChatWidth);
      observer.disconnect();
    };
  }, [isChatPanelOpen]);

  useEffect(() => {
    if (!isCaretNearBottom) {
      setIsMouseNearButton(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const threshold = 60;
      const isNear =
        e.clientX >= rect.left - threshold &&
        e.clientX <= rect.right + threshold &&
        e.clientY >= rect.top - threshold &&
        e.clientY <= rect.bottom + threshold;
      setIsMouseNearButton(isNear);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isCaretNearBottom]);

  const shouldHide = isCaretNearBottom && !isMouseNearButton;

  const leftOffset = leftsidebar.expanded
    ? (SIDEBAR_WIDTH + LAYOUT_PADDING) / 2
    : 0;
  const rightOffset = chatPanelWidth / 2;
  const totalOffset = leftOffset - rightOffset;

  return createPortal(
    <div
      ref={containerRef}
      style={{ left: `calc(50% + ${totalOffset}px)` }}
      className={cn([
        "fixed -translate-x-1/2 z-40 flex items-center gap-3",
        "transition-all duration-200 ease-out",
        shouldHide ? "bottom-0 translate-y-[85%]" : "bottom-4",
      ])}
    >
      {children}
    </div>,
    document.body,
  );
}
