import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { useEffect } from "react";

import { Session } from "@hypr/plugin-db";
import { type TimelineView } from "@hypr/plugin-listener";
import { OngoingSessionProvider } from "@hypr/utils/contexts";
import { SessionsProvider } from "@hypr/utils/contexts";
import { createOngoingSessionStore, createSessionsStore, createSessionStore } from "@hypr/utils/stores";

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
  const ongoingSessionStore = createOngoingSessionStore(sessionsStore);

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
        <OngoingSessionProvider store={ongoingSessionStore}>
          {children}
        </OngoingSessionProvider>
      </SessionsProvider>
    </QueryClientProvider>
  );
}

const mockTranscriptIPC = (): (() => void) | undefined => {
  mockIPC((cmd, _args) => {
    if (cmd == "plugin:listener|get_timeline_view") {
      return handleGetTimeline();
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
