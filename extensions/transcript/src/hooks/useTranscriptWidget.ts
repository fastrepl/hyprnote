import { useTranscript } from "./useTranscript";

export function useTranscriptWidget(sessionId: string | null) {
  const { timeline, isLive, selectedLanguage, handleLanguageChange } = useTranscript(sessionId);

  // Determine the widget state
  const hasTranscript = timeline?.items && timeline.items.length > 0;
  const isSessionActive = sessionId && (hasTranscript || isLive);
  const showEmptyMessage = sessionId && !hasTranscript && !isLive;

  return {
    timeline,
    isLive,
    selectedLanguage,
    handleLanguageChange,
    hasTranscript,
    isSessionActive,
    showEmptyMessage,
  };
}
