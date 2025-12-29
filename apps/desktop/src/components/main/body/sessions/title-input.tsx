import { forwardRef, useRef } from "react";

import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/main";
import { type Tab } from "../../../../store/zustand/tabs";

export const TitleInput = forwardRef<
  HTMLInputElement,
  {
    tab: Extract<Tab, { type: "sessions" }>;
    onNavigateToEditor?: () => void;
  }
>(({ tab, onNavigateToEditor }, ref) => {
  const {
    id: sessionId,
    state: { editor },
  } = tab;
  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);

  const handleEditTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (title: string) => ({ title }),
    [],
    main.STORE_ID,
  );

  const editorId = editor ? "active" : "inactive";
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const input = inputRef.current;
      if (!input) return;

      const cursorPos = input.selectionStart ?? input.value.length;
      const beforeCursor = input.value.slice(0, cursorPos);
      const afterCursor = input.value.slice(cursorPos);

      handleEditTitle(beforeCursor);

      if (afterCursor) {
        setTimeout(() => {
          const event = new CustomEvent("title-content-transfer", {
            detail: { content: afterCursor },
          });
          window.dispatchEvent(event);
        }, 0);
      } else {
        setTimeout(() => {
          const event = new CustomEvent("title-move-to-editor-start");
          window.dispatchEvent(event);
        }, 0);
      }

      onNavigateToEditor?.();
    } else if (e.key === "Tab" || e.key === "ArrowDown") {
      e.preventDefault();
      setTimeout(() => {
        const event = new CustomEvent("title-move-to-editor-start");
        window.dispatchEvent(event);
      }, 0);
      onNavigateToEditor?.();
    }
  };

  return (
    <input
      ref={inputRef}
      id={`title-input-${sessionId}-${editorId}`}
      placeholder="Untitled"
      type="text"
      onChange={(e) => handleEditTitle(e.target.value)}
      onKeyDown={handleKeyDown}
      value={title ?? ""}
      className={cn(
        "w-full transition-opacity duration-200",
        "border-none bg-transparent focus:outline-none",
        "text-xl font-semibold placeholder:text-muted-foreground",
      )}
    />
  );
});
