import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { cn } from "@hypr/ui/lib/utils";
import { useAutoCloser } from "../../hooks/useAutoCloser";
import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";

import { ChatBody } from "./body";
import { ChatHeader } from "./header";
import { ChatMessageInput } from "./input";
import { ChatTrigger } from "./trigger";

export function Chat() {
  const [isOpen, setIsOpen] = useState(false);
  const chatRef = useAutoCloser(() => setIsOpen(false), isOpen);

  useHotkeys("meta+j", () => setIsOpen((prev) => !prev));

  const handleAddMessage = persisted.UI.useSetRowCallback(
    "chat_messages",
    id(),
    (row: persisted.ChatMessage) => ({
      ...row,
      metadata: JSON.stringify(row.metadata),
      parts: JSON.stringify(row.parts),
    } satisfies persisted.ChatMessage),
    [],
    persisted.STORE_ID,
  );

  return (
    <>
      {isOpen
        ? (
          <div
            ref={chatRef}
            className={cn(
              "fixed bottom-4 right-4 z-40",
              "w-[440px] h-[600px] max-h-[calc(100vh-120px)]",
              "bg-white rounded-2xl shadow-2xl",
              "border border-neutral-200",
              "flex flex-col",
              "animate-in slide-in-from-bottom-4 fade-in duration-200",
            )}
          >
            <ChatHeader currentChatId={id()} handleClose={() => setIsOpen(false)} />
            <ChatBody />
            <ChatMessageInput handleAddMessage={handleAddMessage} />
          </div>
        )
        : <ChatTrigger onClick={() => setIsOpen(true)} />}
    </>
  );
}
