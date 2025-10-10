import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import * as persisted from "../../store/tinybase/persisted";
import { id } from "../../utils";
import { ChatBody } from "./body";
import { ChatTrigger } from "./trigger";

export function Chat() {
  const [isOpen, setIsOpen] = useState(false);

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
      <ChatBody
        // TODO
        currentChatId={id()}
        isOpen={isOpen}
        handleClose={() => setIsOpen(false)}
        handleAddMessage={handleAddMessage}
      />
      {!isOpen && <ChatTrigger onClick={() => setIsOpen(true)} />}
    </>
  );
}
