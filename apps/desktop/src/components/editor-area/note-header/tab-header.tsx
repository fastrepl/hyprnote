import { useSession, useOngoingSession } from "@hypr/utils/contexts";
import { cn } from "@hypr/ui/lib/utils";

interface TabHeaderProps {
  sessionId: string;
}

export function TabHeader({ sessionId }: TabHeaderProps) {
  const [showRaw, setShowRaw] = useSession(sessionId, (s) => [
    s.showRaw,
    s.setShowRaw,
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

  const handleTabClick = (tab: 'raw' | 'enhanced') => {
    if (tab === 'raw') {
      setShowRaw(true);
    } else {
      setShowRaw(false);
    }
  };

  return (
    <div className="flex gap-2 px-8 pb-4">
      {/* Raw Note Tab */}
      <button
        onClick={() => handleTabClick('raw')}
        className={cn(
          "px-2 py-1 text-xs font-medium rounded-lg transition-all duration-200",
          showRaw
            ? "bg-neutral-800 text-white"
            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
        )}
      >
        Raw Note
      </button>

      {/* Enhanced Note Tab - show when session ended OR transcript exists OR enhanced memo exists */}
      {shouldShowEnhancedTab && (
        <button
          onClick={() => handleTabClick('enhanced')}
          className={cn(
            "px-2 py-1 text-xs font-medium rounded-lg transition-all duration-200",
            !showRaw
              ? "bg-neutral-800 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          )}
        >
          Enhanced Note
        </button>
      )}
    </div>
  );
}
