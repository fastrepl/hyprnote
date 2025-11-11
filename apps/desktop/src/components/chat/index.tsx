import { commands as windowsCommands } from "@hypr/plugin-windows";

import { useCallback } from "react";

import { useShell } from "../../contexts/shell";
import { useAutoCloser } from "../../hooks/useAutoCloser";
import { InteractiveContainer } from "./interactive";
import { ChatTrigger } from "./trigger";
import { ChatView } from "./view";

export function ChatFloatingButton() {
  const { chat } = useShell();
  const isOpen = chat.mode === "FloatingOpen";

  useAutoCloser(() => chat.sendEvent({ type: "CLOSE" }), { esc: isOpen, outside: false });

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
      <ChatView />
    </InteractiveContainer>
  );
}
