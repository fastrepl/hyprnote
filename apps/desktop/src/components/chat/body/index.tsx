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
}: {
  messages: HyprUIMessage[];
  status: ChatStatus;
  error?: Error;
  onReload?: () => void;
  onStop?: () => void;
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
        "flex-1 overflow-y-auto",
        chat.mode === "RightPanelOpen" && "border mt-1 rounded-md rounded-b-none",
      ])}
    >
      {messages.length === 0
        ? <ChatBodyEmpty />
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
