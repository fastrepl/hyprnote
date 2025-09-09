import type { SelectionData } from "@/contexts/right-panel";
import { tool } from "@hypr/utils/ai";
import { z } from "zod";
import { globalEditorRef } from "../../../../shared/editor-ref";

interface EditEnhancedNoteToolDependencies {
  sessionId: string | null;
  sessions: Record<string, any>;
  selectionData?: SelectionData;
}

export const createEditEnhancedNoteTool = ({
  sessionId,
  sessions,
  selectionData,
}: EditEnhancedNoteToolDependencies) => {
  return tool({
    description:
      "Edit a specific part of the enhanced note by replacing HTML content at given ProseMirror positions with new HTML content. Use this when the user asks to modify, change, or replace specific selected content. The selected content is provided as HTML, and you should respond with HTML that maintains proper formatting.",
    inputSchema: z.object({
      startOffset: z.number().describe("The ProseMirror start position of the content to replace"),
      endOffset: z.number().describe("The ProseMirror end position of the content to replace"),
      newHtml: z.string().describe(
        "The new HTML content to replace the selected content with. Maintain proper HTML structure and formatting.",
      ),
    }),
    execute: async ({ startOffset, endOffset, newHtml }) => {
      if (!sessionId) {
        return { success: false, error: "No session ID available" };
      }

      // Skip session store check if sessions object is empty
      // We rely on having a valid sessionId and editor ref instead
      if (sessions && Object.keys(sessions).length > 0) {
        const sessionStore = sessions[sessionId];
        if (!sessionStore) {
          console.warn("Session store not found in sessions object, but continuing with editor ref");
        }
      }

      try {
        const editor = globalEditorRef.current;

        if (!editor) {
          return { success: false, error: "Editor not available" };
        }

        // Capture original content from selectionData BEFORE making any changes
        const originalContent = selectionData?.text || editor.state.doc.textBetween(startOffset, endOffset);

        // Trim and clean the HTML to prevent empty elements
        const cleanedHtml = newHtml.trim().replace(/>\s+</g, "><");

        // Store initial doc size for accurate position calculation
        const initialDocSize = editor.state.doc.content.size;

        // Delete old content and insert new content with proper parse options
        editor.chain()
          .focus()
          .setTextSelection({ from: startOffset, to: endOffset })
          .deleteSelection()
          .insertContent(cleanedHtml, {
            parseOptions: {
              preserveWhitespace: false,
            },
          })
          .run();

        // Calculate actual inserted content size
        const finalDocSize = editor.state.doc.content.size;
        const insertedSize = finalDocSize - initialDocSize + (endOffset - startOffset);
        const highlightEnd = startOffset + insertedSize;

        // Apply AI highlight to the actually inserted content with metadata
        editor.chain()
          .setTextSelection({ from: startOffset, to: highlightEnd })
          .setAIHighlight({
            timestamp: Date.now().toString(),
            sessionId: sessionId || undefined,
          })
          .run();

        // Create simple floating accept/undo controls
        const createControls = () => {
          const highlighted = document.querySelector("[data-ai-highlight=\"true\"]");
          if (!highlighted) {
            return;
          }

          // Remove any existing controls
          document.querySelector(".ai-edit-controls")?.remove();

          const rect = highlighted.getBoundingClientRect();
          const controls = document.createElement("div");
          controls.className = "ai-edit-controls";
          controls.style.cssText = `
            position: fixed;
            top: ${rect.top - 36}px;
            left: ${rect.left}px;
            z-index: 9999;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 2px;
            display: flex;
            gap: 2px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          `;

          // Undo button
          const undoBtn = document.createElement("button");
          undoBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
            </svg>
            <span style="margin-left: 4px; font-size: 11px;">Undo</span>
          `;
          undoBtn.style.cssText = `
            display: flex;
            align-items: center;
            padding: 4px 8px;
            background: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            color: #374151;
          `;
          undoBtn.onmouseover = () => undoBtn.style.background = "#f3f4f6";
          undoBtn.onmouseout = () => undoBtn.style.background = "white";
          undoBtn.onclick = () => {
            const currentEditor = globalEditorRef.current;
            if (currentEditor) {
              try {
                // Save current cursor position before operations
                const currentSelection = currentEditor.state.selection;
                const cursorPos = currentSelection.head;

                // Simple: Select the highlighted content, delete it, insert original
                currentEditor.chain()
                  .setTextSelection({ from: startOffset, to: highlightEnd })
                  .deleteSelection()
                  .insertContent(originalContent)
                  .run();

                // Restore cursor position (avoid .focus() which moves cursor)
                setTimeout(() => {
                  currentEditor.commands.setTextSelection(cursorPos);
                }, 0);
              } catch (error) {
                console.error("Restoration failed:", error);
              }
            }

            (controls as any).cleanup?.() || controls.remove();
          };

          // Accept button
          const acceptBtn = document.createElement("button");
          acceptBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style="margin-left: 4px; font-size: 11px;">Accept</span>
          `;
          acceptBtn.style.cssText = `
            display: flex;
            align-items: center;
            padding: 4px 8px;
            background: #3b82f6;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            color: white;
          `;
          acceptBtn.onmouseover = () => acceptBtn.style.background = "#2563eb";
          acceptBtn.onmouseout = () => acceptBtn.style.background = "#3b82f6";
          acceptBtn.onclick = () => {
            const currentEditor = globalEditorRef.current;
            if (currentEditor) {
              // Save current cursor position before operations
              const currentSelection = currentEditor.state.selection;
              const cursorPos = currentSelection.head;

              // Remove highlight without calling .focus()
              currentEditor.chain()
                .setTextSelection({ from: startOffset, to: highlightEnd })
                .unsetAIHighlight()
                .run();

              // Restore cursor position
              setTimeout(() => {
                currentEditor.commands.setTextSelection(cursorPos);
              }, 0);
            }
            (controls as any).cleanup?.() || controls.remove();
          };

          controls.appendChild(undoBtn);
          controls.appendChild(acceptBtn);
          document.body.appendChild(controls);

          // Auto-scroll to highlighted content after controls are rendered
          const scrollToHighlight = () => {
            const highlighted = document.querySelector("[data-ai-highlight=\"true\"]");
            if (!highlighted) {
              return;
            }

            const rect = highlighted.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Check if highlighted content is already visible with buffer for controls
            const isVisible = rect.top >= 50
              && rect.bottom <= viewportHeight - 50;

            if (!isVisible) {
              highlighted.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
              });
            } else {
              console.log("Highlight already visible, no scroll needed");
            }
          };

          // Execute scroll after controls are fully rendered
          requestAnimationFrame(scrollToHighlight);

          // Remove controls on outside click
          const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as Node;

            // Check if clicked on controls
            if (controls.contains(target)) {
              return;
            }

            // Check if clicked on highlighted text
            const currentHighlight = document.querySelector("[data-ai-highlight=\"true\"]");
            if (currentHighlight && currentHighlight.contains(target)) {
              return;
            }

            // Clicked outside - accept and cleanup
            const currentEditor = globalEditorRef.current;
            if (currentEditor) {
              // Save current cursor position before operations
              const currentSelection = currentEditor.state.selection;
              const cursorPos = currentSelection.head;

              // Remove highlight without calling .focus()
              currentEditor.chain()
                .setTextSelection({ from: startOffset, to: highlightEnd })
                .unsetAIHighlight()
                .run();

              // Restore cursor position
              setTimeout(() => {
                currentEditor.commands.setTextSelection(cursorPos);
              }, 0);
            }

            // Use cleanup function if available
            (controls as any).cleanup?.() || controls.remove();
          };

          // Use mousedown for more reliable detection, add on next frame
          requestAnimationFrame(() => {
            document.addEventListener("mousedown", handleOutsideClick);
          });

          // Update position on scroll
          const updatePosition = () => {
            const newRect = highlighted.getBoundingClientRect();
            controls.style.top = `${newRect.top - 36}px`;
            controls.style.left = `${newRect.left}px`;
          };
          window.addEventListener("scroll", updatePosition, true);

          // Cleanup function to remove controls and listeners
          const cleanup = () => {
            controls.remove();
            document.removeEventListener("mousedown", handleOutsideClick);
            window.removeEventListener("scroll", updatePosition, true);
          };

          // Store cleanup on the controls element for access by buttons
          (controls as any).cleanup = cleanup;
        };

        // Show controls after a short delay to ensure highlight is rendered
        setTimeout(createControls, 100);

        return {
          success: true,
          message: `Successfully replaced content at positions ${startOffset}-${endOffset} with new HTML content`,
        };
      } catch (error) {
        console.error("Failed to edit enhanced note:", error);
        return {
          success: false,
          error: `Failed to update the enhanced note: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
};
