import { Button } from "@hypr/ui/components/ui/button";
import { MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useHypr } from "@/contexts";
import { useRightPanel } from "@/contexts/right-panel";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";

interface TextSelectionPopoverProps {
  isEnhancedNote: boolean;
  onAnnotate: (selectedText: string, selectedRect: DOMRect) => void;
  onAskAI?: (selectedText: string) => void;
  isAnnotationBoxOpen: boolean;
  sessionId: string;
  editorRef: React.RefObject<{ editor: any }>;
}

interface SelectionInfo {
  text: string;
  rect: DOMRect;
}

export function TextSelectionPopover(
  { isEnhancedNote, onAnnotate, onAskAI, isAnnotationBoxOpen, sessionId, editorRef }: TextSelectionPopoverProps,
) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const delayTimeoutRef = useRef<NodeJS.Timeout>();
  const { userId } = useHypr();
  // Safe hook usage with fallback
  const rightPanel = (() => {
    try {
      return useRightPanel();
    } catch {
      return {
        sendSelectionToChat: () => {
          console.warn("RightPanel not available - selection ignored");
        },
      };
    }
  })();

  const { sendSelectionToChat } = rightPanel;

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

      const editorElement = editorRef.current?.editor?.view?.dom;
      if (!editorElement || !editorElement.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }

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

  // Helper to get TipTap/ProseMirror positions from DOM selection
  const getTipTapPositions = () => {
    const editor = editorRef.current?.editor;
    if (!editor) {
      console.warn("No TipTap editor available");
      return null;
    }

    // Get current TipTap selection positions
    const { from, to } = editor.state.selection;

    // CLEAN HTML APPROACH: Extract selected content as HTML directly
    let selectedHtml = "";
    try {
      // Get the selected DOM range
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();

        // Create a temporary div to get the HTML
        const tempDiv = document.createElement("div");
        tempDiv.appendChild(fragment);
        selectedHtml = tempDiv.innerHTML;
      }

      // Fallback: if no DOM selection, use plain text
      if (!selectedHtml) {
        selectedHtml = editor.state.doc.textBetween(from, to);
      }
    } catch (error) {
      console.warn("Could not extract HTML, falling back to plain text:", error);
      selectedHtml = editor.state.doc.textBetween(from, to);
    }

    return {
      from,
      to,
      text: selectedHtml, // Now contains HTML instead of plain text
    };
  };

  const handleAskAIClick = () => {
    if (!selection) {
      return;
    }

    analyticsCommands.event({
      event: "ask_ai_clicked",
      distinct_id: userId,
    });

    // Get TipTap/ProseMirror positions (much more accurate)
    const tipTapPositions = getTipTapPositions();
    if (!tipTapPositions) {
      console.error("Could not get TipTap positions");
      return;
    }

    // Verify DOM selection matches TipTap selection
    if (selection.text.trim() !== tipTapPositions.text.trim()) {
      console.warn("DOM selection doesn't match TipTap selection:");
      console.warn("DOM:", selection.text);
      console.warn("TipTap:", tipTapPositions.text);
    }

    const selectionData = {
      text: tipTapPositions.text, // Use TipTap's text (more reliable)
      startOffset: tipTapPositions.from, // ProseMirror position
      endOffset: tipTapPositions.to, // ProseMirror position
      sessionId,
      timestamp: Date.now(),
    };

    // Send selection to chat
    sendSelectionToChat(selectionData);

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
        className="flex items-center gap-1 text-xs h-6 px-2 hover:bg-neutral-100 font-normal"
      >
        <MessageSquare className="h-2.5 w-2.5" />
        <span className="text-[11px]">Source</span>
      </Button>

      <div className="w-px h-4 bg-neutral-200 mx-0.5" />

      <Button
        size="sm"
        variant="ghost"
        onClick={handleAskAIClick}
        className="flex items-center gap-1 text-xs h-6 px-2 hover:bg-neutral-100 font-normal"
      >
        <Sparkles className="h-2.5 w-2.5" />
        <span className="text-[11px]">Ask AI</span>
      </Button>
    </div>
  );
}
