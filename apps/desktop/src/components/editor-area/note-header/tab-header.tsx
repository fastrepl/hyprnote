import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { cn } from "@hypr/ui/lib/utils";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { forwardRef, useEffect, useImperativeHandle } from "react";

interface TabHeaderProps {
  sessionId: string;
  onEnhance?: (params: { triggerType: "manual" | "template"; templateId?: string | null }) => void;
  isEnhancing?: boolean;
  progress?: number;
  showProgress?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export interface TabHeaderRef {
  isVisible: boolean;
}

export const TabHeader = forwardRef<TabHeaderRef, TabHeaderProps>(
  ({ sessionId, onEnhance, isEnhancing, progress = 0, showProgress = false, onVisibilityChange }, ref) => {
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
    const isMeetingSession = hasTranscript || isCurrentlyRecording || isEnhancing;

    // BUT use floating button logic for Enhanced tab visibility
    const isEnhancePending = useEnhancePendingState(sessionId);
    const shouldShowEnhancedTab = hasEnhancedMemo || isEnhancePending || canEnhanceTranscript;

    // Automatic tab switching logic following existing conventions

    useEffect(() => {
      // When enhancement starts (immediately after recording ends) -> switch to enhanced note
      if (isEnhancePending || (ongoingSessionStatus === "inactive" && hasTranscript && shouldShowEnhancedTab)) {
        setActiveTab("enhanced");
      }
    }, [isEnhancePending, ongoingSessionStatus, hasTranscript, shouldShowEnhancedTab, setActiveTab]);

    // Set default tab to 'raw' for blank notes (no meeting session)
    useEffect(() => {
      if (!isMeetingSession) {
        setActiveTab("raw");
      }
    }, [isMeetingSession, setActiveTab]);

    const handleTabClick = (tab: "raw" | "enhanced" | "transcript") => {
      setActiveTab(tab);
    };

    // Expose visibility state via ref
    useImperativeHandle(ref, () => ({
      isVisible: isMeetingSession ?? false,
    }), [isMeetingSession]);

    // Notify parent when visibility changes
    useEffect(() => {
      if (onVisibilityChange) {
        onVisibilityChange(isMeetingSession ?? false);
      }
    }, [isMeetingSession, onVisibilityChange]);

    // Don't render tabs at all for blank notes (no meeting session)
    if (!isMeetingSession) {
      return null;
    }

    return (
      <div className="relative">
        {/* Tab container */}
        <div className="bg-white">
          <div className="flex px-8">
            <div className="flex border-b border-neutral-100 w-full">
              {/* Raw Note Tab */}

              {/* Enhanced Note Tab - show when session ended OR transcript exists OR enhanced memo exists */}
              {shouldShowEnhancedTab && (
                <button
                  onClick={() => handleTabClick("enhanced")}
                  className={cn(
                    "relative px-2 py-2 text-xs pl-1 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                    activeTab === "enhanced"
                      ? "text-neutral-900 border-neutral-900"
                      : "text-neutral-600 border-transparent hover:text-neutral-800",
                  )}
                >
                  Summary
                </button>
              )}

              <button
                onClick={() => handleTabClick("raw")}
                className={cn(
                  "relative py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                  shouldShowEnhancedTab ? "pl-3 px-4" : "pl-1 px-2",
                  activeTab === "raw"
                    ? "text-neutral-900 border-neutral-900"
                    : "text-neutral-600 border-transparent hover:text-neutral-800",
                )}
              >
                Memos
              </button>

              {/* Transcript Tab - always show */}
              <button
                onClick={() => handleTabClick("transcript")}
                className={cn(
                  "relative px-4 py-2 text-xs pl-3 font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1.5",
                  activeTab === "transcript"
                    ? "text-neutral-900 border-neutral-900"
                    : "text-neutral-600 border-transparent hover:text-neutral-800",
                )}
              >
                Transcript
                {isCurrentlyRecording && (
                  <div className="relative h-2 w-2">
                    <div className="absolute inset-0 rounded-full bg-red-500/30"></div>
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping"></div>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
