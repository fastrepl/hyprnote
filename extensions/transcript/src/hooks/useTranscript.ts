import { Channel } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as listenerCommands, type SessionEvent, type TimelineView } from "@hypr/plugin-listener";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

export function useTranscript(sessionId: string | null) {
  const ongoingSessionStatus = useOngoingSession((s) => s.status);
  const isEnhanced = sessionId ? useSession(sessionId, (s) => !!s.session.enhanced_memo_html) : false;
  const isLive = useMemo(() => ongoingSessionStatus === "active", [ongoingSessionStatus]);

  const [timeline, setTimeline] = useState<TimelineView | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const fn = async () => {
      const onboardingSessionId = await dbCommands.onboardingSessionId();
      const fn = (sessionId === onboardingSessionId && isEnhanced)
        ? dbCommands.getTimelineViewOnboarding
        : dbCommands.getTimelineView;

      const timeline = await fn(sessionId);
      setTimeline(timeline);
    };

    fn();
  }, [sessionId, isEnhanced]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    
    const channel = new Channel<SessionEvent>();
    listenerCommands.subscribe(channel);

    channel.onmessage = (e) => {
      if (e.type === "timelineView") {
        setTimeline((prev) => {
          if (!prev) {
            return e.timeline;
          }

          return {
            items: [...prev.items, ...e.timeline.items],
          };
        });
      }
    };

    return () => {
      listenerCommands.unsubscribe(channel);
    };
  }, [sessionId]);

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
  };

  return {
    timeline,
    isLive,
    selectedLanguage,
    handleLanguageChange,
  };
}
