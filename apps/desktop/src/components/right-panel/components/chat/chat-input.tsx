import { useQuery } from "@tanstack/react-query";
import { ArrowUpIcon, BuildingIcon, FileTextIcon, UserIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { useHypr, useRightPanel } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { BadgeType } from "../../types/chat-types";

import Editor, { type TiptapEditor } from "@hypr/tiptap/editor";

interface ChatInputProps {
  inputValue: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (mentionedContent?: Array<{ id: string; type: string; label: string }>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
  entityId?: string;
  entityType?: BadgeType;
  onNoteBadgeClick?: () => void;
  isGenerating?: boolean;
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
  }: ChatInputProps,
) {
  const { userId } = useHypr();
  const { chatInputRef } = useRightPanel();

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

  const extractMentionedContent = useCallback(() => {
    if (!editorRef.current?.editor) {
      return [];
    }

    const doc = editorRef.current.editor.getJSON();
    const mentions: Array<{ id: string; type: string; label: string }> = [];

    const traverseNode = (node: any) => {
      if (node.type === "mention" || node.type === "mention-@") {
        if (node.attrs) {
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

    onSubmit(mentionedContent);

    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.setContent("<p></p>");

      const syntheticEvent = {
        target: { value: "" },
        currentTarget: { value: "" },
      } as React.ChangeEvent<HTMLTextAreaElement>;

      onChange(syntheticEvent);
    }
  }, [onSubmit, onChange, extractMentionedContent]);

  useEffect(() => {
    if (chatInputRef && typeof chatInputRef === "object" && editorRef.current?.editor) {
      (chatInputRef as any).current = editorRef.current.editor.view.dom;
    }
  }, [chatInputRef]);

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
        return <UserIcon className="size-3" />;
      case "organization":
        return <BuildingIcon className="size-3" />;
      case "note":
      default:
        return <FileTextIcon className="size-3" />;
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
          min-height: 40px !important;
          max-height: 120px !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
        }
        .chat-editor .tiptap-normal strong,
        .chat-editor .tiptap-normal em,
        .chat-editor .tiptap-normal u,
        .chat-editor .tiptap-normal h1,
        .chat-editor .tiptap-normal h2,
        .chat-editor .tiptap-normal h3,
        .chat-editor .tiptap-normal ul,
        .chat-editor .tiptap-normal ol,
        .chat-editor .tiptap-normal blockquote {
          all: unset !important;
          display: inline !important;
        }
        .chat-editor .tiptap-normal p {
          margin: 0 !important;
          display: inline !important;
        }
        .chat-editor .mention {
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
        .chat-editor .mention:hover {
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

      <div className={`relative chat-editor ${inputValue.trim() ? "has-content" : ""}`}>
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

      <div className="flex items-center justify-between pb-2 px-3">
        {entityId
          ? (
            <Badge
              className="mr-2 bg-white text-black border border-border inline-flex items-center gap-1 hover:bg-neutral-100 cursor-pointer max-w-48"
              onClick={onNoteBadgeClick}
            >
              {getBadgeIcon()}
              <span className="truncate">{entityTitle}</span>
            </Badge>
          )
          : <div></div>}

        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isGenerating}
        >
          <ArrowUpIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
