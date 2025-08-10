import { Button } from "@hypr/ui/components/ui/button";
import { MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";

interface TextSelectionPopoverProps {
  isEnhancedNote: boolean;
  onAnnotate: (selectedText: string, selectedRect: DOMRect) => void;
  onAskAI?: (selectedText: string) => void;
  isAnnotationBoxOpen: boolean; // Add this prop
}

interface SelectionInfo {
  text: string;
  rect: DOMRect;
}

export function TextSelectionPopover(
  { isEnhancedNote, onAnnotate, onAskAI, isAnnotationBoxOpen }: TextSelectionPopoverProps,
) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const delayTimeoutRef = useRef<NodeJS.Timeout>();
  const { userId } = useHypr();

  useEffect(() => {
    if (!isEnhancedNote) {
      setSelection(null);
      return;
    }

    const handleSelectionChange = () => {
      // Don't show popover if annotation box is open
      if (isAnnotationBoxOpen) {
        setSelection(null);
        return;
      }

      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }

      const sel = window.getSelection();

      if (!sel || sel.isCollapsed || sel.toString().trim().length === 0) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const selectedText = sel.toString().trim();
      if (selectedText.length > 0) {
        delayTimeoutRef.current = setTimeout(() => {
          setSelection({
            text: selectedText,
            rect,
          });
        }, 600);
      } else {
        setSelection(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".text-selection-popover")) {
        setSelection(null);
        if (delayTimeoutRef.current) {
          clearTimeout(delayTimeoutRef.current);
        }
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mouseup", handleSelectionChange);
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mouseup", handleSelectionChange);
      document.removeEventListener("click", handleClickOutside);

      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, [isEnhancedNote, isAnnotationBoxOpen]); // Add isAnnotationBoxOpen to dependencies

  // Hide popover if annotation box is open or no selection
  if (!selection || !isEnhancedNote || isAnnotationBoxOpen) {
    return null;
  }

  const handleAnnotateClick = () => {
    analyticsCommands.event({
      event: "source_view_clicked",
      distinct_id: userId,
    });

    onAnnotate(selection.text, selection.rect);
    setSelection(null); // Hide the popover
  };

  const handleAskAIClick = () => {
    if (onAskAI) {
      onAskAI(selection.text);
    }
    setSelection(null);
  };

  const getPopoverPosition = (rect: DOMRect) => {
    const popoverWidth = 140;
    const popoverHeight = 24;
    const margin = 15;
    const distanceFromText = 10;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    let top = rect.top - popoverHeight - distanceFromText;

    if (left < margin) {
      left = margin;
    } else if (left + popoverWidth > window.innerWidth - margin) {
      left = window.innerWidth - popoverWidth - margin;
    }

    if (top < margin) {
      top = rect.bottom + distanceFromText;
    }

    return { left, top };
  };

  const position = getPopoverPosition(selection.rect);

  return (
    <div
      className="text-selection-popover fixed z-50 bg-white border border-neutral-200 rounded-md shadow-lg px-1 py-0.5 flex items-center transition-all duration-200 ease-out"
      style={{
        left: position.left,
        top: position.top,
      }}
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={handleAnnotateClick}
        className="flex items-center gap-1 text-xs h-5 px-1.5 hover:bg-neutral-100 font-normal"
      >
        <MessageSquare className="h-2.5 w-2.5" />
        <span className="text-[11px]">Source</span>
      </Button>

      <div className="w-px h-3 bg-neutral-200 mx-0.5" />

      <Button
        size="sm"
        variant="ghost"
        onClick={handleAskAIClick}
        className="flex items-center gap-1 text-xs h-5 px-1.5 hover:bg-neutral-100 font-normal opacity-60 cursor-not-allowed"
        disabled
      >
        <Sparkles className="h-2.5 w-2.5" />
        <span className="text-[11px]">Ask AI</span>
        <span className="text-[9px] text-neutral-400 ml-0.5">coming soon</span>
      </Button>
    </div>
  );
}
