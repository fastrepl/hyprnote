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

  const { chat } = useShell();
  const isOpen = chat.mode === "FloatingOpen";

  useAutoCloser(() => chat.sendEvent({ type: "CLOSE" }), { esc: isOpen, outside: false });
  useHotkeys("mod+j", () => {
    if (isOpen) {
      chat.sendEvent({ type: "CLOSE" });
    } else {
      chat.sendEvent({ type: "OPEN" });
    }
  });

  const handleClickTrigger = useCallback(async () => {
    const isExists = await windowsCommands.windowIsExists({ type: "chat" });
    if (isExists) {
      windowsCommands.windowDestroy({ type: "chat" });
    }
    chat.sendEvent({ type: "OPEN" });
  }, [chat]);

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
        onClose={() => chat.sendEvent({ type: "CLOSE" })}
      />
    </InteractiveContainer>
  );
}
