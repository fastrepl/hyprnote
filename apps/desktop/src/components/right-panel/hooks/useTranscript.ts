import { useEffect, useMemo, useState } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { events as listenerEvents, type Word } from "@hypr/plugin-listener";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

export function useTranscript(sessionId: string | null) {
  const ongoingSessionState = useOngoingSession((s) => ({
    status: s.status,
    sessionId: s.sessionId,
  }));
  const isEnhanced = sessionId ? useSession(sessionId, (s) => !!s.session.enhanced_memo_html) : false;

  const isLive = useMemo(() =>
    ongoingSessionState.status === "running_active"
    && ongoingSessionState.sessionId === sessionId, [
    ongoingSessionState.status,
    ongoingSessionState.sessionId,
    sessionId,
  ]);

  const [words, setWords] = useState<Word[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!sessionId) {
      setWords([]);
      return;
    }

    setIsLoading(true);
    const fn = async () => {
      try {
        const onboardingSessionId = await dbCommands.onboardingSessionId();
        const fn = (sessionId === onboardingSessionId && isEnhanced)
          ? dbCommands.getWordsOnboarding
          : dbCommands.getWords;

        const words = await fn(sessionId);
        setWords(words);
      } finally {
        setIsLoading(false);
      }
    };

    fn();
  }, [sessionId, isEnhanced]);

  useEffect(() => {
    if (ongoingSessionState.status !== "running_active" || ongoingSessionState.sessionId !== sessionId) {
      return;
    }

    let unlisten: (() => void) | null = null;

    listenerEvents.sessionEvent.listen(({ payload }) => {
      if (payload.type === "words") {
        setWords((words) => [...words, ...payload.words]);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [ongoingSessionState.status, ongoingSessionState.sessionId, sessionId]);

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
  };

  return {
    words,
    isLive,
    selectedLanguage,
    handleLanguageChange,
    isLoading,
  };
}
