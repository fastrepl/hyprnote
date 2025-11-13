import { cn } from "@hypr/utils";

import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";

import type { HyprUIMessage } from "../../../chat/types";
import { useShell } from "../../../contexts/shell";
import { ChatBodyEmpty } from "./empty";
import { ChatBodyNonEmpty } from "./non-empty";

export function ChatBody({
  messages,
  status,
  error,
  onReload,
  onStop,
  isModelConfigured = true,
}: {
  messages: HyprUIMessage[];
  status: ChatStatus;
  error?: Error;
  onReload?: () => void;
  onStop?: () => void;
  isModelConfigured?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { chat } = useShell();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status, error]);

  return (
    <div
      ref={scrollRef}
      className={cn([
        "flex-1 overflow-y-auto flex flex-col",
        chat.mode === "RightPanelOpen" && "border mt-1 rounded-md rounded-b-none",
      ])}
    >
      <div className="flex-1" />
      {messages.length === 0
        ? <ChatBodyEmpty isModelConfigured={isModelConfigured} />
        : (
          <ChatBodyNonEmpty
            messages={messages}
            status={status}
            error={error}
            onReload={onReload}
            onStop={onStop}
          />
        )}
    </div>
  );
}
