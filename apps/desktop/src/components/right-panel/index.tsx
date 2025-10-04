import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { ResizablePanel } from "@hypr/ui/components/ui/resizable";
import { useRightPanel } from "@hypr/utils/contexts";
import { ChatView } from "./views";

export default function RightPanel() {
  const { isExpanded } = useRightPanel();
  const show = getCurrentWebviewWindowLabel() === "main" && isExpanded;

  if (!show) {
    return null;
  }

  return (
    <ResizablePanel
      minSize={30}
      maxSize={50}
      className="h-full border-l bg-neutral-50 overflow-hidden"
    >
      <ChatView />
    </ResizablePanel>
  );
}
