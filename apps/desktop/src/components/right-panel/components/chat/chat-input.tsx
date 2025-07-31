import { useQuery } from "@tanstack/react-query";
import { ArrowUpIcon, BuildingIcon, FileTextIcon, UserIcon } from "lucide-react";
import { useEffect, useRef, useCallback } from "react";

import { useHypr, useRightPanel } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { BadgeType } from "../../types/chat-types";

// Only use what's actually available
import Editor, { type TiptapEditor } from "@hypr/tiptap/editor";

interface ChatInputProps {
  inputValue: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (mentionedNotes?: Array<{ id: string; type: string; label: string }>) => void;
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

  // Mention search function (same as main editor)
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
      limit: 5 
    });

    return sessions.map((s) => ({
      id: s.id,
      type: "note" as const,
      label: s.title || "Untitled Note",
    }));
  }, [userId]);

  // Helper function to extract plain text from HTML
  const extractPlainText = useCallback((html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }, []);

  // Handle content changes from the Editor
  const handleContentChange = useCallback((html: string) => {
    const plainText = extractPlainText(html);
    
    // Create synthetic event to maintain compatibility
    const syntheticEvent = {
      target: { value: plainText },
      currentTarget: { value: plainText },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    onChange(syntheticEvent);
  }, [onChange, extractPlainText]);

  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);

  // Extract mentioned notes from editor content
  const extractMentionedNotes = useCallback(() => {
    if (!editorRef.current?.editor) return [];
    
    const doc = editorRef.current.editor.getJSON();
    const mentions: Array<{ id: string; type: string; label: string }> = [];
    
    // Recursive function to traverse the document tree
    const traverseNode = (node: any) => {
      // Check for mention nodes
      if (node.type === 'mention' || node.type === 'mention-@') {
        if (node.attrs) {
          mentions.push({
            id: node.attrs.id || node.attrs['data-id'],
            type: node.attrs.type || node.attrs['data-type'] || 'note',
            label: node.attrs.label || node.attrs['data-label'] || 'Unknown',
          });
        }
      }
      
      // Check for mention marks
      if (node.marks && Array.isArray(node.marks)) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'mention' || mark.type === 'mention-@') {
            if (mark.attrs) {
              mentions.push({
                id: mark.attrs.id || mark.attrs['data-id'],
                type: mark.attrs.type || mark.attrs['data-type'] || 'note',
                label: mark.attrs.label || mark.attrs['data-label'] || 'Unknown',
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

  // Handle submit and clear editor
  const handleSubmit = useCallback(() => {
    const mentionedNotes = extractMentionedNotes();
    
    /*
    if (mentionedNotes.length > 0) {
      console.log("🔗 Mentioned notes in chat message:");
      mentionedNotes.forEach((mention, index) => {
        console.log(`  ${index + 1}. "${mention.label}" (ID: ${mention.id}, Type: ${mention.type})`);
      });
      console.log(`Total mentions: ${mentionedNotes.length}`);
    } else {
      console.log("No notes mentioned in this message");
    }
    */
    
    // Call the original onSubmit with mentioned notes
    onSubmit(mentionedNotes);
    
    // Clear the editor content
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.setContent("<p></p>");
      
      // Trigger onChange with empty value
      const syntheticEvent = {
        target: { value: "" },
        currentTarget: { value: "" },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      
      onChange(syntheticEvent);
    }
  }, [onSubmit, onChange, extractMentionedNotes]);

  // Expose editor reference for compatibility
  useEffect(() => {
    if (chatInputRef && typeof chatInputRef === "object" && editorRef.current?.editor) {
      (chatInputRef as any).current = editorRef.current.editor.view.dom;
    }
  }, [chatInputRef]);

  // Disable rich text formatting and mention clicks
  useEffect(() => {
    const editor = editorRef.current?.editor;
    if (editor) {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Disable common rich text shortcuts
        if (event.metaKey || event.ctrlKey) {
          if (['b', 'i', 'u', 'k'].includes(event.key.toLowerCase())) {
            event.preventDefault();
            return;
          }
        }
        
        // Handle Enter for submission
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          
          // Only submit if there's content
          if (inputValue.trim()) {
            handleSubmit();
          }
        }
      };

      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        // Prevent clicks on mentions
        if (target && (target.classList.contains('mention') || target.closest('.mention'))) {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      };

      editor.view.dom.addEventListener('keydown', handleKeyDown);
      editor.view.dom.addEventListener('click', handleClick);
      
      return () => {
        editor.view.dom.removeEventListener('keydown', handleKeyDown);
        editor.view.dom.removeEventListener('click', handleClick);
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
      <style>{`
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
        .chat-editor .tiptap-normal .is-empty::before {
          content: "Ask anything about this note..." !important;
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
      `}</style>
      
      <div className="relative chat-editor">
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