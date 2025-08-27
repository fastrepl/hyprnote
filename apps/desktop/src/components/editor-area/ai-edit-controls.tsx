import { Check, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import type { TiptapEditor } from "@hypr/tiptap/editor";

interface AIEditControlsProps {
  editor: TiptapEditor | null;
  editId: string;
  originalContent: string;
  startOffset: number;
  endOffset: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export function AIEditControls({
  editor,
  editId,
  originalContent,
  startOffset,
  endOffset,
  onAccept,
  onDismiss,
}: AIEditControlsProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  // Calculate position based on highlighted text
  const updatePosition = () => {
    if (!editor) return;

    // Find the highlighted element
    const highlightedElement = document.querySelector('[data-ai-highlight="true"]');
    if (!highlightedElement) {
      setPosition(null);
      return;
    }

    const rect = highlightedElement.getBoundingClientRect();
    const controlsHeight = 36; // Approximate height of controls
    const margin = 8;

    // Calculate position (prefer above the highlight)
    let top = rect.top - controlsHeight - margin;
    let left = rect.left;

    // If too close to top, position below
    if (top < margin) {
      top = rect.bottom + margin;
    }

    // Ensure it doesn't go off-screen horizontally
    const controlsWidth = 180; // Approximate width
    if (left + controlsWidth > window.innerWidth - margin) {
      left = window.innerWidth - controlsWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    setPosition({ top, left });
  };

  // Update position on mount and when editor changes
  useEffect(() => {
    updatePosition();

    // Update position on scroll or resize
    const handleUpdate = () => updatePosition();
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);
    
    // Also listen for editor updates
    const updateHandler = () => {
      requestAnimationFrame(updatePosition);
    };
    
    if (editor) {
      editor.on("update", updateHandler);
    }

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
      if (editor) {
        editor.off("update", updateHandler);
      }
    };
  }, [editor]);

  // Handle undo - restore original content
  const handleUndo = () => {
    if (!editor) return;

    try {
      // Use TipTap's built-in undo if it's the most recent action
      // This preserves better undo/redo history
      if (editor.can().undo()) {
        editor.commands.undo();
      } else {
        // Fallback: manually restore original content
        editor.chain()
          .focus()
          .setTextSelection({ from: startOffset, to: endOffset })
          .deleteSelection()
          .insertContent(originalContent)
          .run();
      }
      
      onDismiss();
    } catch (error) {
      console.error("Failed to undo AI edit:", error);
      // Try simple undo as last resort
      editor.commands.undo();
      onDismiss();
    }
  };

  // Handle accept - just remove highlight and cleanup
  const handleAccept = () => {
    if (!editor) return;

    // Remove the AI highlight mark
    editor.chain()
      .focus()
      .unsetAIHighlight()
      .run();

    onAccept();
  };

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(event.target as Node)
      ) {
        // Check if they clicked on the highlighted text itself
        const target = event.target as HTMLElement;
        if (!target.closest('[data-ai-highlight="true"]')) {
          handleAccept(); // Auto-accept on click outside
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!position) return null;

  return (
    <motion.div
      ref={controlsRef}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 bg-white border border-neutral-200 rounded-md shadow-lg p-0.5 flex items-center gap-0.5"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs hover:bg-neutral-100 font-normal"
        onClick={handleUndo}
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        Undo
      </Button>

      <div className="w-px h-4 bg-neutral-200" />

      <Button
        size="sm"
        className="h-7 px-2 text-xs bg-blue-500 hover:bg-blue-600 text-white font-normal"
        onClick={handleAccept}
      >
        <Check className="h-3 w-3 mr-1" />
        Accept
      </Button>
    </motion.div>
  );
}