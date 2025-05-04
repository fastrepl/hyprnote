import { useQuery } from "@tanstack/react-query";
import { ArrowUpIcon, BuildingIcon, FileTextIcon, UserIcon } from "lucide-react";
import { useEffect } from "react";

import { useRightPanel } from "@/contexts";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { BadgeType } from "../../views";

interface ChatInputProps {
  inputValue: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
  entityId?: string;
  entityType?: BadgeType;
  onNoteBadgeClick?: () => void;
}

export function ChatInput(
  { inputValue, onChange, onSubmit, onKeyDown, autoFocus = false, entityId, entityType = "note", onNoteBadgeClick }:
    ChatInputProps,
) {
  const { chatInputRef } = useRightPanel();

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

  useEffect(() => {
    const textarea = chatInputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    const baseHeight = 40;
    const newHeight = Math.max(textarea.scrollHeight, baseHeight);
    textarea.style.height = `${newHeight}px`;
  }, [inputValue, chatInputRef]);

  useEffect(() => {
    const textarea = chatInputRef.current;
    if (textarea) {
      textarea.style.height = "40px";
      if (autoFocus) {
        textarea.focus();
      }
    }
  }, [autoFocus, chatInputRef]);

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
    <div className="border border-b-0 border-input dark:border-zinc-700 mx-4 rounded-t-lg overflow-clip flex flex-col bg-white dark:bg-zinc-800">
      <textarea
        ref={chatInputRef}
        value={inputValue}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Type a message..."
        className="w-full resize-none overflow-hidden px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground dark:placeholder:text-zinc-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[120px]"
        rows={1}
      />
      <div className="flex items-center justify-between pb-2 px-3">
        {entityId
          ? (
            <Badge
              className="mr-2 bg-white text-black dark:bg-zinc-800 dark:text-white border border-border dark:border-zinc-700 inline-flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-zinc-700 cursor-pointer"
              onClick={onNoteBadgeClick}
            >
              {getBadgeIcon()} {entityTitle}
            </Badge>
          )
          : <div></div>}

        <Button
          size="icon"
          onClick={onSubmit}
          disabled={!inputValue.trim()}
        >
          <ArrowUpIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
