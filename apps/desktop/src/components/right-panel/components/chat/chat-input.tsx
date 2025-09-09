import { useQuery } from "@tanstack/react-query";
import { ArrowUpIcon, BuildingIcon, FileTextIcon, Square, UserIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { useHypr, useRightPanel } from "@/contexts";
import type { SelectionData } from "@/contexts/right-panel";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { BadgeType } from "../../types/chat-types";

import Editor, { type TiptapEditor } from "@hypr/tiptap/editor";

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
  }: ChatInputProps,
) {
  const { userId } = useHypr();
  const { chatInputRef, pendingSelection, clearPendingSelection } = useRightPanel();

  const lastBacklinkSearchTime = useRef<number>(0);

  const { data: noteData } = useQuery({
    queryKey: ["session", entityId],
    queryFn: async () => entityId ? dbCommands.getSession({ id: entityId }) : null,
    enabled: !!entityId && entityType === "note",
  });

  const { data: humanData } = useQuery({
    queryKey: ["human", entityId],
    queryFn: async () => entityId ? dbCommands.getHuman(entityId) : null,
    enabled: !!entityId && entityType === "human",
  });

  const { data: organizationData } = useQuery({
    queryKey: ["org", entityId],
    queryFn: async () => entityId ? dbCommands.getOrganization(entityId) : null,
    enabled: !!entityId && entityType === "organization",
  });

  const getEntityTitle = () => {
    if (!entityId) {
      return "";
    }

    switch (entityType) {
      case "note":
        return noteData?.title || "Untitled";
      case "human":
        return humanData?.full_name || "";
      case "organization":
        return organizationData?.name || "";
      default:
        return "";
    }
  };

  const handleMentionSearch = useCallback(async (query: string) => {
    const now = Date.now();
    const timeSinceLastEvent = now - lastBacklinkSearchTime.current;

    if (timeSinceLastEvent >= 5000) {
      analyticsCommands.event({
        event: "searched_backlink",
        distinct_id: userId,
      });
      lastBacklinkSearchTime.current = now;
    }

    const sessions = await dbCommands.listSessions({
      type: "search",
      query,
      user_id: userId,
      limit: 3,
    });

    const noteResults = sessions.map((s) => ({
      id: s.id,
      type: "note" as const,
      label: s.title || "Untitled Note",
    }));

    const humans = await dbCommands.listHumans({
      search: [3, query],
    });

    const peopleResults = humans
      .filter(h => h.full_name && h.full_name.toLowerCase().includes(query.toLowerCase()))
      .map((h) => ({
        id: h.id,
        type: "human" as const,
        label: h.full_name || "Unknown Person",
      }));

    return [...noteResults, ...peopleResults].slice(0, 5);
  }, [userId]);

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

  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const processedSelectionRef = useRef<string | null>(null);

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

    // Extract HTML content before clearing the editor
    let htmlContent = "";
    if (editorRef.current?.editor) {
      htmlContent = editorRef.current.editor.getHTML();
    }

    // Pass the pending selection data and HTML content to the submit handler
    onSubmit(mentionedContent, pendingSelection || undefined, htmlContent);

    // Clear the selection after submission
    clearPendingSelection();

    // Reset processed selection so new selections can be processed
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
      // Create a unique ID for this selection to avoid processing it multiple times
      const selectionId = `${pendingSelection.startOffset}-${pendingSelection.endOffset}-${pendingSelection.timestamp}`;

      // Only process if we haven't already processed this exact selection
      if (processedSelectionRef.current !== selectionId) {
        // Create compact reference with text preview instead of just positions
        const noteName = noteData?.title || humanData?.full_name || organizationData?.name || "Note";

        const selectedHtml = pendingSelection.text || "";

        // Strip HTML tags to get plain text
        const stripHtml = (html: string): string => {
          const temp = document.createElement("div");
          temp.innerHTML = html;
          return temp.textContent || temp.innerText || "";
        };

        const selectedText = stripHtml(selectedHtml).trim();

        const textPreview = selectedText.length > 0
          ? (selectedText.length > 6
            ? `'${selectedText.slice(0, 6)}...'` // Use single quotes instead!
            : `'${selectedText}'`)
          : "NO_TEXT";

        const selectionRef = textPreview !== "NO_TEXT"
          ? `[${noteName} - ${textPreview}(${pendingSelection.startOffset}:${pendingSelection.endOffset})]`
          : `[${noteName} - ${pendingSelection.startOffset}:${pendingSelection.endOffset}]`;

        // Escape quotes for HTML attribute
        const escapedSelectionRef = selectionRef.replace(/"/g, "&quot;");

        const referenceText =
          `<a class="mention selection-ref" data-mention="true" data-id="selection-${pendingSelection.startOffset}-${pendingSelection.endOffset}" data-type="selection" data-label="${escapedSelectionRef}" contenteditable="false">${selectionRef}</a> `;

        editorRef.current.editor.commands.setContent(referenceText);
        editorRef.current.editor.commands.focus("end");

        // Clear the input value to match editor content
        const syntheticEvent = {
          target: { value: selectionRef },
          currentTarget: { value: selectionRef },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);

        // Mark this selection as processed
        processedSelectionRef.current = selectionId;
      }
    }
  }, [pendingSelection, onChange, noteData?.title, humanData?.full_name, organizationData?.name]);

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

  const entityTitle = getEntityTitle();

  return (
    <div className="border border-b-0 border-input mx-4 rounded-t-lg overflow-clip flex flex-col bg-white">
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
          content: "Ask anything about this note..." !important;
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
            handleSearch: handleMentionSearch,
          }}
        />
        {isGenerating && !inputValue.trim() && (
          <div className="placeholder-overlay">Ask anything about this note...</div>
        )}
      </div>

      {/* Bottom area stays fixed */}
      <div className="flex items-center justify-between pb-2 px-3 flex-shrink-0">
        {entityId
          ? (
            <Badge
              className="mr-2 bg-white text-black border border-border inline-flex items-center gap-1 hover:bg-white max-w-48"
              onClick={onNoteBadgeClick}
            >
              <div className="shrink-0">
                {getBadgeIcon()}
              </div>
              <span className="truncate">{entityTitle}</span>
            </Badge>
          )
          : <div></div>}

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
    </div>
  );
}
