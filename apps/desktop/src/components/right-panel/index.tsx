import { useRightPanel } from "@/contexts";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { ResizablePanel } from "@hypr/ui/components/ui/resizable";
import { ChatView, TranscriptView } from "./views";

export default function RightPanel() {
  const { isExpanded, currentView } = useRightPanel();
  const show = getCurrentWebviewWindowLabel() === "main" && isExpanded;

  if (!show) {
    return null;
  }

  return (
    <ResizablePanel minSize={30} maxSize={50} className="h-full border-l bg-neutral-50 overflow-hidden">
      {(currentView === "transcript") ? <TranscriptView /> : <ChatView />}
    </ResizablePanel>
  );
}
