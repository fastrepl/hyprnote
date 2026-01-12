import { useShell } from "../../contexts/shell";
import { ChatHeader } from "./header";

export function ChatView() {
  const { chat } = useShell();

  return (
    <div className="flex flex-col h-full gap-1">
      <ChatHeader
        currentChatGroupId={undefined}
        onNewChat={() => {}}
        onSelectChat={() => {}}
        handleClose={() => chat.sendEvent({ type: "CLOSE" })}
      />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">
            Chat Feature Coming Soon
          </div>
          <div className="text-sm">
            This feature is currently under development.
          </div>
        </div>
      </div>
    </div>
  );
}
