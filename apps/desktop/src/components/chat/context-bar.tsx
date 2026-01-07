import { X } from "lucide-react";

import { cn } from "@hypr/utils";

import { useShell } from "../../contexts/shell";
import type { ContextRef } from "../../contexts/shell/chat";
import { useSession } from "../../hooks/tinybase";

export function ContextBar() {
  const { chat } = useShell();

  if (chat.refs.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 px-3 py-2 overflow-x-auto">
      {chat.refs.map((ref) => (
        <ContextChip
          key={`${ref.type}-${ref.id}`}
          contextRef={ref}
          onRemove={() => chat.removeRef(ref.id)}
        />
      ))}
    </div>
  );
}

function ContextChip({
  contextRef,
  onRemove,
}: {
  contextRef: ContextRef;
  onRemove: () => void;
}) {
  const title = useRefTitle(contextRef);

  return (
    <div
      className={cn([
        "flex items-center gap-1 px-2 py-1 rounded-md text-xs",
        "bg-neutral-100 text-neutral-700",
        "border border-neutral-200",
      ])}
    >
      <span className="truncate max-w-[120px]">{title}</span>
      <button
        onClick={onRemove}
        className="text-neutral-400 hover:text-neutral-600 transition-colors"
        title="Remove context"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function useRefTitle(ref: ContextRef): string {
  const { title } = useSession(ref.type === "session" ? ref.id : "");

  if (ref.type === "session") {
    return (title as string) || "Untitled Session";
  }

  return ref.id;
}
