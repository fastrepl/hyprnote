import { useSession } from "@hypr/utils/contexts";
import { useTranscript } from "./useTranscript";

export function useTranscriptWidget(sessionId: string | null) {
  const { timeline, isLive, selectedLanguage, handleLanguageChange, isLoading } = useTranscript(sessionId);
  const isEnhanced = sessionId ? useSession(sessionId, (s) => !!s.session.enhanced_memo_html) : false;

  const hasTranscript = timeline?.items && timeline.items.length > 0;
  const isSessionActive = sessionId && (hasTranscript || isLive);

  const showEmptyMessage = sessionId && !hasTranscript && !isLive && !isLoading;

  return {
    timeline,
    isLive,
    selectedLanguage,
    handleLanguageChange,
    hasTranscript,
    isSessionActive,
    showEmptyMessage,
    isEnhanced,
    isLoading,
  };
}
