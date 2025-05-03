import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isTauri } from "@tauri-apps/api/core";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { useEffect } from "react";

import { Session } from "@hypr/plugin-db";
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
      cleanup = mockTwentyIPC();
    }

    return () => cleanup?.();
  }, []);

  const sessionsStore = createSessionsStore();
  const ongoingSessionStore = createOngoingSessionStore(sessionsStore);

  const session: Session = {
    id: sessionId ?? crypto.randomUUID(),
    created_at: new Date().toISOString(),
    visited_at: new Date().toISOString(),
    user_id: crypto.randomUUID(),
    calendar_event_id: crypto.randomUUID(),
    title: "@hypr/extension-twenty",
    raw_memo_html: "Test Transcript",
    enhanced_memo_html: "# Enhanced Memo",
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

const mockTwentyIPC = (): () => void => {
  mockIPC((cmd, _args) => {
    if (cmd == "plugin:auth|get_from_vault") {
      return null;
    }

    if (cmd == "plugin:auth|set_in_vault") {
      return null;
    }

    console.warn(`'${cmd}' is not mocked`);
  });

  return () => clearMocks();
};
