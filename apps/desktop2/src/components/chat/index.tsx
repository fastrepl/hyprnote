import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { commands as windowsCommands } from "@hypr/plugin-windows/v1";
import { useAutoCloser } from "../../hooks/useAutoCloser";
import { InteractiveContainer } from "./interactive";
import { ChatTrigger } from "./trigger";
import { ChatView } from "./view";

export function ChatFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatGroupId, setChatGroupId] = useState<string | undefined>(undefined);

  useAutoCloser(() => setIsOpen(false), { esc: isOpen, outside: false });
  useHotkeys("mod+j", () => setIsOpen((prev) => !prev));

  const handleClickTrigger = useCallback(async () => {
    const isExists = await windowsCommands.windowIsExists({ type: "chat" });
    if (isExists) {
      windowsCommands.windowDestroy({ type: "chat" });
    }
    setIsOpen(true);
  }, []);

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
        onClose={() => setIsOpen(false)}
      />
    </InteractiveContainer>
  );
}
