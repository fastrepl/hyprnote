import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { commands as windowsCommands } from "@hypr/plugin-windows/v1";
import { useShell } from "../../contexts/shell";
import { useAutoCloser } from "../../hooks/useAutoCloser";
import { InteractiveContainer } from "./interactive";
import { ChatTrigger } from "./trigger";
import { ChatView } from "./view";

export function ChatFloatingButton() {
  const [chatGroupId, setChatGroupId] = useState<string | undefined>(undefined);

  const { chatMode, sendChatEvent } = useShell();

  const isOpen = chatMode === "FloatingOpen";

  useAutoCloser(() => sendChatEvent({ type: "CLOSE" }), { esc: isOpen, outside: false });
  useHotkeys("mod+j", () => {
    if (isOpen) {
      sendChatEvent({ type: "CLOSE" });
    } else {
      sendChatEvent({ type: "OPEN" });
    }
  });

  const handleClickTrigger = useCallback(async () => {
    const isExists = await windowsCommands.windowIsExists({ type: "chat" });
    if (isExists) {
      windowsCommands.windowDestroy({ type: "chat" });
    }
    sendChatEvent({ type: "OPEN" });
  }, [sendChatEvent]);

  if (!isOpen) {
    return <ChatTrigger onClick={handleClickTrigger} />;
  }

  return (
    <InteractiveContainer
      width={window.innerWidth * 0.4}
      height={window.innerHeight * 0.7}
    >
      <ChatView
        chatGroupId={chatGroupId}
        setChatGroupId={setChatGroupId}
        onClose={() => sendChatEvent({ type: "CLOSE" })}
      />
    </InteractiveContainer>
  );
}
