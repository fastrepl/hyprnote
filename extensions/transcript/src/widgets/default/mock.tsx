import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Channel, isTauri } from "@tauri-apps/api/core";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { useEffect } from "react";

import { Session } from "@hypr/plugin-db";
import { type SessionEvent, TimelineView } from "@hypr/plugin-listener";
import { OngoingSessionProvider } from "@hypr/utils/contexts";
import { SessionsProvider } from "@hypr/utils/contexts";
import { createSessionsStore, createSessionStore } from "@hypr/utils/stores";
import { sleep } from "../../utils";

const queryClient = new QueryClient();

export default function MockProvider({
  children,
  sessionId,
}: {
  children: React.ReactNode;
  sessionId?: string;
}) {
  useEffect(() => {
    let cleanup: (() => void) | undefined = undefined;

    // Will cause "Attempted to assign to read only property" in Tauri env
    if (!isTauri()) {
      cleanup = mockTranscriptIPC();
    }

    return () => cleanup?.();
  }, []);

  const sessionsStore = createSessionsStore();

  const session: Session = {
    id: sessionId ?? crypto.randomUUID(),
    created_at: new Date().toISOString(),
    visited_at: new Date().toISOString(),
    user_id: "1",
    calendar_event_id: "1",
    title: "Test Session",
    raw_memo_html: "Test Transcript",
    enhanced_memo_html: null,
    conversations: [],
  };
  sessionsStore.setState({
    currentSessionId: session.id,
    sessions: {
      [session.id]: createSessionStore(session),
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionsProvider store={sessionsStore}>
        <OngoingSessionProvider sessionsStore={sessionsStore}>
          {children}
        </OngoingSessionProvider>
      </SessionsProvider>
    </QueryClientProvider>
  );
}

const mockTranscriptIPC = (): (() => void) | undefined => {
  mockIPC((cmd, args) => {
    if (cmd == "plugin:listener|get_timeline_view") {
      return handleGetTimeline();
    }

    if (cmd == "plugin:listener|subscribe") {
      return handleListenerSubscribe((args as any).channel as Channel<SessionEvent>);
    }

    console.warn(`'${cmd}' is not mocked`);
  });

  return () => clearMocks();
};

const handleGetTimeline = () => {
  return {
    items: [],
  } satisfies TimelineView;
};

const handleListenerSubscribe = (channel: Channel<SessionEvent>) => {
  (async () => {
    let currentTime = 0;

    // John starts the meeting
    await sleep(500);
    currentTime += 0.5;
    channel.onmessage({
      type: "timelineView",
      timeline: {
        items: [
          {
            start: currentTime,
            end: currentTime + 3,
            speaker: "John",
            text: "Hey team, thanks for joining. Today we'll discuss the new transcription feature requirements.",
          },
        ],
      },
    });

    // Sarah responds
    await sleep(3500);
    currentTime += 3.5;
    channel.onmessage({
      type: "timelineView",
      timeline: {
        items: [
          {
            start: currentTime,
            end: currentTime + 5,
            speaker: "Sarah",
            text:
              "I've been working on some mockups based on user feedback. The main request is for real-time updates and clear speaker identification.",
          },
        ],
      },
    });

    // Mike adds technical context
    await sleep(5500);
    currentTime += 5.5;
    channel.onmessage({
      type: "timelineView",
      timeline: {
        items: [
          {
            start: currentTime,
            end: currentTime + 4,
            speaker: "Mike",
            text:
              "That aligns with our backend capabilities. We can stream the transcription with about 500ms latency.",
          },
        ],
      },
    });

    // John asks about timeline
    await sleep(4500);
    currentTime += 4.5;
    channel.onmessage({
      type: "timelineView",
      timeline: {
        items: [
          {
            start: currentTime,
            end: currentTime + 2,
            speaker: "John",
            text: "What's our timeline for implementing this?",
          },
        ],
      },
    });

    // Sarah provides estimate
    await sleep(3000);
    currentTime += 3;
    channel.onmessage({
      type: "timelineView",
      timeline: {
        items: [
          {
            start: currentTime,
            end: currentTime + 4,
            speaker: "Sarah",
            text: "The UI work should take about two weeks. We already have most of the components ready.",
          },
        ],
      },
    });

    // Mike confirms backend timeline
    await sleep(4500);
    currentTime += 4.5;
    channel.onmessage({
      type: "timelineView",
      timeline: {
        items: [
          {
            start: currentTime,
            end: currentTime + 3,
            speaker: "Mike",
            text: "Backend integration can be done in parallel. We should be ready for testing in two weeks.",
          },
        ],
      },
    });

    // Meeting wrap-up
    await sleep(3500);
    currentTime += 3.5;
    channel.onmessage({
      type: "timelineView",
      timeline: {
        items: [
          {
            start: currentTime,
            end: currentTime + 2,
            speaker: "John",
            text: "Perfect, let's reconvene next week for a progress check. Thanks everyone!",
          },
        ],
      },
    });

    // Send stopped event after a brief pause
    await sleep(2500);
    channel.onmessage({
      type: "stopped",
    });
  })();
};
