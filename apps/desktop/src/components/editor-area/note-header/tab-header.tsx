import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { TabHeader as TabHeaderUI } from "@hypr/ui/components/block/tab-header";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

interface TabHeaderProps {
  sessionId: string;
  onEnhance?: (params: { triggerType: "manual" | "template"; templateId?: string | null }) => void;
  isEnhancing?: boolean;
  progress?: number;
  showProgress?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const TabHeader = (
  { sessionId, onEnhance, isEnhancing, progress = 0, showProgress = false, onVisibilityChange }: TabHeaderProps,
) => {
  const [activeTab, setActiveTab] = useSession(sessionId, (s) => [
    s.activeTab,
    s.setActiveTab,
  ]);

  const session = useSession(sessionId, (s) => s.session);

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const ongoingSessionId = useOngoingSession((s) => s.sessionId);

  // Check if this is a meeting session (has transcript or is currently recording)
  const hasTranscript = session.words && session.words.length > 0;
  const isCurrentlyRecording = ongoingSessionStatus === "running_active" && ongoingSessionId === sessionId;
  const isSessionInactive = ongoingSessionStatus === "inactive" || session.id !== ongoingSessionId;
  const hasEnhancedMemo = !!session?.enhanced_memo_html;

  const canEnhanceTranscript = hasTranscript && isSessionInactive;

  // Keep the "meeting session" concept for overall tab visibility
  const shouldShowTab = hasTranscript || isCurrentlyRecording || isEnhancing || hasEnhancedMemo;

  // BUT use floating button logic for Enhanced tab visibility
  const isEnhancePending = useEnhancePendingState(sessionId);
  const shouldShowEnhancedTab = hasEnhancedMemo || isEnhancePending || canEnhanceTranscript;

  return (
    <TabHeaderUI
      isEnhancing={isEnhancing}
      onVisibilityChange={onVisibilityChange}
      onTabChange={setActiveTab}
      currentTab={activeTab}
      isCurrentlyRecording={isCurrentlyRecording}
      shouldShowTab={shouldShowTab}
      shouldShowEnhancedTab={shouldShowEnhancedTab}
    />
  );
};
