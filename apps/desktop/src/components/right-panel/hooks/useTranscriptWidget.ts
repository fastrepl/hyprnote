import { useSession } from "@hypr/utils/contexts";
import { useTranscript } from "./useTranscript";

export function useTranscriptWidget(sessionId: string | null) {
  const { words, isLive, selectedLanguage, handleLanguageChange } = useTranscript(sessionId);
  const isEnhanced = sessionId ? useSession(sessionId, (s) => !!s.session.enhanced_memo_html) : false;

  const hasTranscript = words.length > 0;
  const isSessionActive = sessionId && (hasTranscript || isLive);

  const showEmptyMessage = sessionId && !hasTranscript && !isLive;

  return {
    words,
    isLive,
    selectedLanguage,
    handleLanguageChange,
    hasTranscript,
    isSessionActive,
    showEmptyMessage,
    isEnhanced,
  };
}
