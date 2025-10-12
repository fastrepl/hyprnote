import { type LinkProps } from "@tanstack/react-router";
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
  useHotkeys("meta+j", () => setIsOpen((prev) => !prev));

  const handleClickTrigger = useCallback(async () => {
    const isExists = await windowsCommands.windowIsExists({ type: "chat" });
    if (isExists) {
      windowsCommands.windowDestroy({ type: "chat" });
    }
    setIsOpen(true);
  }, []);

  const handlePopOut = useCallback(() => {
    const url = { to: "/app/chat", search: { id: chatGroupId } } as const satisfies LinkProps;
    windowsCommands.windowShow({ type: "chat" }).then(() => {
      setIsOpen(false);
      setTimeout(() => {
        windowsCommands.windowEmitNavigate({ type: "chat" }, {
          path: url.to,
          search: url.search,
        });
      }, 1000);
    });
  }, [chatGroupId]);

  if (!isOpen) {
    return <ChatTrigger onClick={handleClickTrigger} />;
  }

  return (
    <InteractiveContainer
      onPopOut={handlePopOut}
      width={window.innerWidth * 0.5}
      height={window.innerHeight * 0.8}
    >
      <ChatView
        chatGroupId={chatGroupId}
        setChatGroupId={setChatGroupId}
        onClose={() => setIsOpen(false)}
      />
    </InteractiveContainer>
  );
}
