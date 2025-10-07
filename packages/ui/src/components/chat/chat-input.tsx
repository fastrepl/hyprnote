import { ArrowUpIcon, BrainIcon, BuildingIcon, FileTextIcon, Square, UserIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { type SelectionData } from "@hypr/utils/contexts";
import { BadgeType } from "@hypr/ui/components/chat/chat-types";

import Editor, { type TiptapEditor } from "@hypr/tiptap/editor";
import { ChatModelInfoModal } from "@hypr/ui/components/chat/chat-model-info-modal";

interface ChatInputProps {
  inputValue: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (
    mentionedContent?: Array<{ id: string; type: string; label: string }>,
    selectionData?: SelectionData,
    htmlContent?: string,
  ) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
  entityId?: string;
  entityType?: BadgeType;
  onNoteBadgeClick?: () => void;
  isGenerating?: boolean;
  onStop?: () => void;
  // Props from useChatInput hook
  isModelModalOpen: boolean;
  setIsModelModalOpen: (open: boolean) => void;
  entityTitle: string;
  currentModelName: string;
  pendingSelection: SelectionData | null;
  handleMentionSearch: (search: string, editor: any) => Promise<any>;
  processSelection: (selection: any) => { id: string; html: string; text: string; } | null;
  clearPendingSelection: () => void;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onChooseModel: () => void;
}

export function ChatInput(
  {
    inputValue,
    onChange,
    onSubmit,
    onKeyDown,
    autoFocus = false,
    entityId,
    entityType = "note",
    onNoteBadgeClick,
    isGenerating = false,
    onStop,
    isModelModalOpen,
    setIsModelModalOpen,
    entityTitle,
    currentModelName,
    pendingSelection,
    handleMentionSearch,
    processSelection,
    clearPendingSelection,
    chatInputRef,
    onChooseModel,
  }: ChatInputProps,
) {
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const processedSelectionRef = useRef<string | null>(null);

  const extractPlainText = useCallback((html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }, []);

  const handleContentChange = useCallback((html: string) => {
    const plainText = extractPlainText(html);

    const syntheticEvent = {
      target: { value: plainText },
      currentTarget: { value: plainText },
    } as React.ChangeEvent<HTMLTextAreaElement>;

    onChange(syntheticEvent);
  }, [onChange, extractPlainText]);

  // Editor-specific extraction logic (kept here as it needs editor instance)
  const extractMentionedContent = useCallback(() => {
    if (!editorRef.current?.editor) {
      return [];
    }

    const doc = editorRef.current.editor.getJSON();
    const mentions: Array<{ id: string; type: string; label: string }> = [];

    const traverseNode = (node: any) => {
      if (node.type === "mention" || node.type === "mention-@") {
        if (node.attrs && node.attrs.type !== "selection") {
          mentions.push({
            id: node.attrs.id || node.attrs["data-id"],
            type: node.attrs.type || node.attrs["data-type"] || "note",
            label: node.attrs.label || node.attrs["data-label"] || "Unknown",
          });
        }
      }

      if (node.marks && Array.isArray(node.marks)) {
        node.marks.forEach((mark: any) => {
          if (mark.type === "mention" || mark.type === "mention-@") {
            if (mark.attrs) {
              mentions.push({
                id: mark.attrs.id || mark.attrs["data-id"],
                type: mark.attrs.type || mark.attrs["data-type"] || "note",
                label: mark.attrs.label || mark.attrs["data-label"] || "Unknown",
              });
            }
          }
        });
      }

      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverseNode);
      }
    };

    if (doc.content) {
      doc.content.forEach(traverseNode);
    }

    return mentions;
  }, []);

  const handleSubmit = useCallback(() => {
    const mentionedContent = extractMentionedContent();
    let htmlContent = "";
    if (editorRef.current?.editor) {
      htmlContent = editorRef.current.editor.getHTML();
    }

    // Call the submit handler and clear pending selection
    onSubmit(mentionedContent, pendingSelection || undefined, htmlContent);
    clearPendingSelection();

    // Reset editor
    processedSelectionRef.current = null;
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.setContent("<p></p>");
      const syntheticEvent = {
        target: { value: "" },
        currentTarget: { value: "" },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
    }
  }, [onSubmit, onChange, extractMentionedContent, pendingSelection, clearPendingSelection]);

  useEffect(() => {
    if (chatInputRef && typeof chatInputRef === "object" && editorRef.current?.editor) {
      (chatInputRef as any).current = editorRef.current.editor.view.dom;
    }
  }, [chatInputRef]);

  // Handle pending selection from text selection popover
  useEffect(() => {
    if (pendingSelection && editorRef.current?.editor) {
      const processed = processSelection(pendingSelection);
      if (processed && processedSelectionRef.current !== processed.id) {
        editorRef.current.editor.commands.setContent(processed.html);
        editorRef.current.editor.commands.focus("end");

        const syntheticEvent = {
          target: { value: processed.text },
          currentTarget: { value: processed.text },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);

        processedSelectionRef.current = processed.id;
      }
    }
  }, [pendingSelection, onChange, processSelection]);

  useEffect(() => {
    const editor = editorRef.current?.editor;
    if (editor) {
      // override TipTap's Enter behavior completely
      editor.setOptions({
        editorProps: {
          handleKeyDown: (view, event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              const mentionDropdown = document.querySelector(".mention-container");
              if (mentionDropdown) {
                return false;
              }

              const isEmpty = view.state.doc.textContent.trim() === "";
              if (isEmpty) {
                return true;
              }
              if (inputValue.trim()) {
                event.preventDefault();
                handleSubmit();
                return true;
              }
            }
            return false;
          },
        },
      });
    }
  }, [editorRef.current?.editor, inputValue, handleSubmit]);

  useEffect(() => {
    const editor = editorRef.current?.editor;
    if (editor) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey) {
          if (["b", "i", "u", "k"].includes(event.key.toLowerCase())) {
            event.preventDefault();
            return;
          }
        }

        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();

          if (inputValue.trim()) {
            handleSubmit();
          }
        }
      };

      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target && (target.classList.contains("mention") || target.closest(".mention"))) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      };

      editor.view.dom.addEventListener("keydown", handleKeyDown);
      editor.view.dom.addEventListener("click", handleClick);

      return () => {
        editor.view.dom.removeEventListener("keydown", handleKeyDown);
        editor.view.dom.removeEventListener("click", handleClick);
      };
    }
  }, [editorRef.current?.editor, onKeyDown, handleSubmit, inputValue]);

  const getBadgeIcon = () => {
    switch (entityType) {
      case "human":
        return <UserIcon className="size-3 shrink-0" />;
      case "organization":
        return <BuildingIcon className="size-3 shrink-0" />;
      case "note":
      default:
        return <FileTextIcon className="size-3 shrink-0" />;
    }
  };

  return (
    <div className="border border-b-0 border-input mx-4 rounded-t-lg overflow-clip flex flex-col bg-white">
      {/* Note badge at top */}
      {entityId && (
        <div className="px-3 pt-2 pb-2">
          <Badge
            className="bg-white text-black border border-border inline-flex items-center gap-1 hover:bg-white"
            onClick={onNoteBadgeClick}
          >
            <div className="shrink-0">
              {getBadgeIcon()}
            </div>
            <span className="truncate max-w-[200px]">{entityTitle}</span>
          </Badge>
        </div>
      )}

      {/* Custom styles to disable rich text features */}
      <style>
        {`
        .chat-editor .tiptap-normal {
          padding: 12px 40px 12px 12px !important;
          min-height: 50px !important;
          max-height: 90px !important;  
          font-size: 14px !important;
          line-height: 1.5 !important;
        }
        .chat-editor .tiptap-normal strong:not(.selection-ref),
        .chat-editor .tiptap-normal em:not(.selection-ref),
        .chat-editor .tiptap-normal u:not(.selection-ref),
        .chat-editor .tiptap-normal h1:not(.selection-ref),
        .chat-editor .tiptap-normal h2:not(.selection-ref),
        .chat-editor .tiptap-normal h3:not(.selection-ref),
        .chat-editor .tiptap-normal ul:not(.selection-ref),
        .chat-editor .tiptap-normal ol:not(.selection-ref),
        .chat-editor .tiptap-normal blockquote:not(.selection-ref),
        .chat-editor .tiptap-normal span:not(.selection-ref) {
          all: unset !important;
          display: inline !important;
        }
        .chat-editor .tiptap-normal p {
          margin: 0 !important;
          display: block !important;  
        }
        .chat-editor .mention:not(.selection-ref) {
          color: #3b82f6 !important;
          font-weight: 500 !important;
          text-decoration: none !important;
          border-radius: 0.25rem !important;
          background-color: rgba(59, 130, 246, 0.08) !important;
          padding: 0.1rem 0.25rem !important;
          font-size: 0.9rem !important;
          cursor: default !important;
          pointer-events: none !important;
        }
        .chat-editor .mention:not(.selection-ref):hover {
          background-color: rgba(59, 130, 246, 0.08) !important;
          text-decoration: none !important;
        }
        .chat-editor.has-content .tiptap-normal .is-empty::before {
          display: none !important;
        }
        .chat-editor:not(.has-content) .tiptap-normal .is-empty::before {
          content: "Ask anything, @ to add contexts..." !important;
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .chat-editor .placeholder-overlay {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 40px;
          color: #9ca3af;
          pointer-events: none;
          font-size: 14px;
          line-height: 1.5;
        }
      `}
      </style>

      {/* Make the editor area flex-grow and scrollable */}
      <div className={`relative chat-editor flex-1 overflow-y-auto ${inputValue.trim() ? "has-content" : ""}`}>
        <Editor
          ref={editorRef}
          handleChange={handleContentChange}
          initialContent={inputValue || ""}
          editable={!isGenerating}
          mentionConfig={{
            trigger: "@",
            handleSearch: (query: string) => handleMentionSearch(query, editorRef.current?.editor),
          }}
        />
        {isGenerating && !inputValue.trim() && (
          <div className="placeholder-overlay">Ask anything, @ to add contexts...</div>
        )}
      </div>

      {/* Bottom area stays fixed */}
      <div className="flex items-center justify-between pt-2 pb-2 px-3 flex-shrink-0">
        <button
          className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer flex items-center gap-1 min-w-0"
          onClick={() => setIsModelModalOpen(true)}
        >
          <BrainIcon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate max-w-[120px]">{currentModelName}</span>
        </button>

        <Button
          size="icon"
          onClick={isGenerating ? onStop : handleSubmit}
          disabled={isGenerating ? false : (!inputValue.trim())}
        >
          {isGenerating
            ? (
              <Square
                className="h-4 w-4"
                fill="currentColor"
                strokeWidth={0}
              />
            )
            : <ArrowUpIcon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Model info modal */}
      <ChatModelInfoModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        onChooseModel={onChooseModel}
      />
    </div>
  );
}
