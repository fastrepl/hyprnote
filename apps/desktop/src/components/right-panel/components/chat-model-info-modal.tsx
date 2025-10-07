import { commands as windowsCommands } from "@hypr/plugin-windows";
import { ChatModelInfoModal as ChatModelInfoModalUI } from "@hypr/ui/components/chat/chat-model-info-modal";

interface ChatModelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseModel: () => void;
}

export function ChatModelInfoModal({ isOpen, onClose }: ChatModelInfoModalProps) {
  const handleChooseModel = () => {
    windowsCommands.windowShow({ type: "settings" }).then(() => {
      setTimeout(() => {
        windowsCommands.windowEmitNavigate({ type: "settings" }, {
          path: "/app/settings",
          search: { tab: "ai-llm" },
        });
      }, 800);
    });
    onClose();
  };

  return <ChatModelInfoModalUI isOpen={isOpen} onClose={onClose} onChooseModel={handleChooseModel} />;
}

