import { usePrevious } from "@uidotdev/usehooks";
import { SparklesIcon } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { useTitleGenerating } from "../../../../hooks/useTitleGenerating";
import * as main from "../../../../store/tinybase/store/main";
import { type Tab } from "../../../../store/zustand/tabs";

export const TitleInput = forwardRef<
  HTMLInputElement,
  {
    tab: Extract<Tab, { type: "sessions" }>;
    onNavigateToEditor?: () => void;
    onGenerateTitle?: () => void;
  }
>(({ tab, onNavigateToEditor, onGenerateTitle }, ref) => {
  const {
    id: sessionId,
    state: { view },
  } = tab;
  const storeTitle = main.UI.useCell(
    "sessions",
    sessionId,
    "title",
    main.STORE_ID,
  );
  const isGenerating = useTitleGenerating(sessionId);
  const wasGenerating = usePrevious(isGenerating);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [localTitle, setLocalTitle] = useState(storeTitle ?? "");
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setLocalTitle(storeTitle ?? "");
    }
  }, [storeTitle]);

  const editorId = view ? "active" : "inactive";
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

  useEffect(() => {
    if (wasGenerating && !isGenerating) {
      setShowRevealAnimation(true);
      const timer = setTimeout(() => {
        setShowRevealAnimation(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [wasGenerating, isGenerating]);

  const persistTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (title: string) => ({ title }),
    [],
    main.STORE_ID,
  );

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

      persistTitle(beforeCursor);

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

  if (isGenerating) {
    return (
      <div className="w-full h-[28px] flex items-center">
        <span className="text-xl font-semibold text-muted-foreground animate-pulse">
          Generating title...
        </span>
      </div>
    );
  }

  if (showRevealAnimation) {
    return (
      <div className="w-full h-[28px] flex items-center overflow-hidden">
        <span className="text-xl font-semibold animate-reveal-left whitespace-nowrap">
          {storeTitle}
        </span>
      </div>
    );
  }

  const hasTitle = Boolean(localTitle?.trim());
  const showButton = hasTitle && onGenerateTitle;

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        ref={inputRef}
        id={`title-input-${sessionId}-${editorId}`}
        placeholder="Untitled"
        type="text"
        onChange={(e) => setLocalTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          isFocused.current = true;
        }}
        onBlur={() => {
          isFocused.current = false;
          persistTitle(localTitle);
        }}
        value={localTitle}
        className={cn([
          "flex-1 min-w-0 transition-opacity duration-200",
          "border-none bg-transparent focus:outline-none",
          "text-xl font-semibold placeholder:text-muted-foreground",
        ])}
      />
      {showButton && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onGenerateTitle?.();
          }}
          onMouseDown={(e) => e.preventDefault()}
          className={cn([
            "shrink-0",
            "text-muted-foreground hover:text-foreground",
            "opacity-50 hover:opacity-100 transition-opacity",
          ])}
        >
          <SparklesIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});
