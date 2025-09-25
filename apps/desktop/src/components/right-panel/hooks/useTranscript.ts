import { useEffect, useMemo, useState } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { events as listenerEvents, type Word2 as Word } from "@hypr/plugin-listener";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";
import { useQuery } from "@tanstack/react-query";

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

  const [finalWords, setFinalWords] = useState<Word[]>([]);
  const [partialWords, setPartialWords] = useState<Word[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const words = useMemo(() => {
    const result = [...finalWords, ...partialWords].sort((a, b) => (a.start_ms ?? 0) - (b.start_ms ?? 0));
    return result;
  }, [
    finalWords,
    partialWords,
  ]);

  const existingWords = useQuery({
    enabled: !!sessionId,
    queryKey: ["session", "words", sessionId],
    queryFn: async () => {
      const onboardingSessionId = await dbCommands.onboardingSessionId();
      const fn = (sessionId === onboardingSessionId && isEnhanced)
        ? dbCommands.getWordsOnboarding
        : dbCommands.getWords;

      return fn(sessionId!);
    },
  });

  useEffect(() => {
    setFinalWords(existingWords.data ?? []);
    setPartialWords([]);
  }, [existingWords.data]);

  useEffect(() => {
    if (ongoingSessionState.status !== "running_active" || ongoingSessionState.sessionId !== sessionId) {
      return;
    }

    let unlisten: (() => void) | null = null;

    listenerEvents.sessionEvent.listen(({ payload }) => {
      if (payload.type === "finalWords") {
        const words = Object.values(payload.words).flat().filter((v) => !!v);
        setFinalWords((existing) => [...existing, ...words]);
      } else if (payload.type === "partialWords") {
        const words = Object.values(payload.words).flat().filter((v) => !!v);
        setPartialWords(words);
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
    partialWords,
    finalWords,
    isLive,
    selectedLanguage,
    handleLanguageChange,
  };
}
