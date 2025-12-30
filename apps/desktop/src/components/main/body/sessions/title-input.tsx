import { forwardRef, useEffect, useRef } from "react";

import { cn } from "@hypr/utils";

import { useAITaskTask } from "../../../../hooks/useAITaskTask";
import * as main from "../../../../store/tinybase/main";
import { createTaskId } from "../../../../store/zustand/ai-task/task-configs";
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
    state: { view },
  } = tab;
  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);

  const titleTaskId = createTaskId(sessionId, "title");
  const { isGenerating: isTitleGenerating } = useAITaskTask(
    titleTaskId,
    "title",
  );

  const handleEditTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (title: string) => ({ title }),
    [],
    main.STORE_ID,
  );

  const editorId = view ? "active" : "inactive";
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

  useEffect(() => {
    const handleMoveToTitlePosition = (e: Event) => {
      const customEvent = e as CustomEvent<{ pixelWidth: number }>;
      const pixelWidth = customEvent.detail.pixelWidth;
      const input = inputRef.current;

      if (input && input.value) {
        const titleStyle = window.getComputedStyle(input);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.font = `${titleStyle.fontWeight} ${titleStyle.fontSize} ${titleStyle.fontFamily}`;

          let charPos = 0;
          for (let i = 0; i <= input.value.length; i++) {
            const currentWidth = ctx.measureText(input.value.slice(0, i)).width;
            if (currentWidth >= pixelWidth) {
              charPos = i;
              break;
            }
            charPos = i;
          }

          input.setSelectionRange(charPos, charPos);
        }
      }
    };

    window.addEventListener(
      "editor-move-to-title-position",
      handleMoveToTitlePosition,
    );
    return () => {
      window.removeEventListener(
        "editor-move-to-title-position",
        handleMoveToTitlePosition,
      );
    };
  }, [inputRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      return;
    }

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
    } else if (e.key === "Tab") {
      e.preventDefault();
      setTimeout(() => {
        const event = new CustomEvent("title-move-to-editor-start");
        window.dispatchEvent(event);
      }, 0);
      onNavigateToEditor?.();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const input = inputRef.current;
      if (!input) return;

      const cursorPos = input.selectionStart ?? 0;
      const textBeforeCursor = input.value.slice(0, cursorPos);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const titleStyle = window.getComputedStyle(input);
        ctx.font = `${titleStyle.fontWeight} ${titleStyle.fontSize} ${titleStyle.fontFamily}`;
        const titleWidth = ctx.measureText(textBeforeCursor).width;

        setTimeout(() => {
          const event = new CustomEvent("title-move-to-editor-position", {
            detail: { pixelWidth: titleWidth },
          });
          window.dispatchEvent(event);
        }, 0);
      }

      onNavigateToEditor?.();
    }
  };

  if (isTitleGenerating) {
    return (
      <div className="w-full h-7">
        <div
          className={cn([
            "h-6 w-48 rounded-md",
            "bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200",
            "animate-shimmer bg-[length:200%_100%]",
          ])}
        />
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      id={`title-input-${sessionId}-${editorId}`}
      placeholder="Untitled"
      type="text"
      onChange={(e) => handleEditTitle(e.target.value)}
      onKeyDown={handleKeyDown}
      value={title ?? ""}
      className={cn([
        "w-full transition-opacity duration-200",
        "border-none bg-transparent focus:outline-none",
        "text-xl font-semibold placeholder:text-muted-foreground",
      ])}
    />
  );
});
