import { useEffect } from "react";
import { useSession, useOngoingSession } from "@hypr/utils/contexts";
import { cn } from "@hypr/ui/lib/utils";

interface TabHeaderProps {
  sessionId: string;
}

export function TabHeader({ sessionId }: TabHeaderProps) {
  const [activeTab, setActiveTab] = useSession(sessionId, (s) => [
    s.activeTab,
    s.setActiveTab,
  ]);
  const session = useSession(sessionId, (s) => s.session);

  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const ongoingSessionId = useOngoingSession((s) => s.sessionId);

  // Check the three conditions as requested
  const hasTranscript = session.words && session.words.length > 0;
  const isSessionInactive = ongoingSessionStatus === "inactive" || session.id !== ongoingSessionId;
  const hasEnhancedMemo = !!session?.enhanced_memo_html;
  
  // Show Enhanced Note tab when: session ended OR transcript exists OR enhanced memo exists
  const canEnhanceTranscript = hasTranscript && isSessionInactive;
  const shouldShowEnhancedTab = hasEnhancedMemo || canEnhanceTranscript;

  // Automatic tab switching logic following existing conventions
  useEffect(() => {
    // When recording starts for this session -> switch to transcript
    if (ongoingSessionStatus === "running_active" && ongoingSessionId === sessionId) {
      setActiveTab('transcript');
    }
  }, [ongoingSessionStatus, ongoingSessionId, sessionId, setActiveTab]);

  useEffect(() => {
    // When recording ends and session has transcript -> switch to enhanced note
    if (ongoingSessionStatus === "inactive" && hasTranscript && shouldShowEnhancedTab) {
      setActiveTab('enhanced');
    }
  }, [ongoingSessionStatus, hasTranscript, shouldShowEnhancedTab, setActiveTab]);

  const handleTabClick = (tab: 'raw' | 'enhanced' | 'transcript') => {
    setActiveTab(tab);
  };

  return (
    <div className="relative">
      {/* Tab container */}
      <div className="bg-white">
        <div className="flex px-8">
          {/* Raw Note Tab */}
          <button
            onClick={() => handleTabClick('raw')}
            className={cn(
              "relative px-4 py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px",
              activeTab === 'raw'
                ? "text-neutral-900 border-neutral-900"
                : "text-neutral-600 border-transparent hover:text-neutral-800"
            )}
          >
            Your Note
          </button>

          {/* Enhanced Note Tab - show when session ended OR transcript exists OR enhanced memo exists */}
          {shouldShowEnhancedTab && (
            <button
              onClick={() => handleTabClick('enhanced')}
              className={cn(
                "relative px-4 py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px",
                activeTab === 'enhanced'
                  ? "text-neutral-900 border-neutral-900"
                  : "text-neutral-600 border-transparent hover:text-neutral-800"
              )}
            >
              Summary
            </button>
          )}

          {/* Transcript Tab - always show */}
          <button
            onClick={() => handleTabClick('transcript')}
            className={cn(
              "relative px-4 py-2 text-xs font-medium transition-all duration-200 border-b-2 -mb-px",
              activeTab === 'transcript'
                ? "text-neutral-900 border-neutral-900"
                : "text-neutral-600 border-transparent hover:text-neutral-800"
            )}
          >
            Transcript
          </button>
        </div>
      </div>
    </div>
  );
}
