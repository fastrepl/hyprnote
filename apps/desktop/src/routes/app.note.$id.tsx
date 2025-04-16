import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import EditorArea from "@/components/editor-area";
import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import {
  commands as windowsCommands,
  events as windowsEvents,
  getCurrentWebviewWindowLabel,
} from "@hypr/plugin-windows";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

export const Route = createFileRoute("/app/note/$id")({
  beforeLoad: ({ context: { queryClient, sessionsStore }, params: { id } }) => {
    return queryClient.fetchQuery({
      queryKey: ["session", id],
      queryFn: async () => {
        let session: Session | null = null;

        try {
          const [s, _] = await Promise.all([
            dbCommands.getSession({ id }),
            dbCommands.visitSession(id),
          ]);
          session = s;
        } catch (e) {
          console.error(e);
        }

        if (!session) {
          return redirect({ to: "/app/new" });
        }

        const { insert, setCurrentSessionId } = sessionsStore.getState();
        insert(session);
        setCurrentSessionId(session.id);

        return session;
      },
    });
  },
  component: Component,
});

function Component() {
  const { id: sessionId } = Route.useParams();
  const navigate = useNavigate();

  const { getLatestSession } = useSession(sessionId, (s) => ({
    getLatestSession: s.get,
    session: s.session,
  }));
  const getOngoingSession = useOngoingSession((s) => s.get);

  const video = "wGZpAB6610200nRG2uRG2t9bS1008y009RUWUJTnSlevpPc";
  const onboardingSessionId = useQuery({
    queryKey: ["onboarding-session-id"],
    queryFn: () => dbCommands.onboardingSessionId(),
  });
  const isEnhancePending = useEnhancePendingState(sessionId);
  const { startOngoingSession, stopOngoingSession, ongoingSessionStatus } = useOngoingSession((s) => ({
    startOngoingSession: s.start,
    stopOngoingSession: s.stop,
    ongoingSessionStatus: s.status,
  }));

  const isOnboardingSession = onboardingSessionId.data === sessionId;

  const onboardingSupport = isOnboardingSession
    ? {
      isOnboardingSession: true,
      videoId: video,
      ongoingSessionStatus,
      playOnboardingVideo: () => {
        if (ongoingSessionStatus === "inactive" && !isEnhancePending) {
          startOngoingSession(sessionId);
        }
      },
      stopOnboardingVideo: () => {
        stopOngoingSession();
        windowsCommands.windowDestroy({ type: "video", value: video });
      },
    }
    : null;

  useEffect(() => {
    const isEmpty = (s: string | null) => s === "<p></p>" || !s;

    return () => {
      const { session } = getLatestSession();
      const { sessionId: ongoingSessionId } = getOngoingSession();

      const shouldDelete = !session.title
        && isEmpty(session.raw_memo_html)
        && isEmpty(session.enhanced_memo_html)
        && session.conversations.length === 0
        && ongoingSessionId !== session.id;

      if (shouldDelete) {
        mutation.mutate();
      }
    };
  }, [getLatestSession]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["delete-session", sessionId],
    mutationFn: () => dbCommands.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      console.error(error);
    },
  });

  useEffect(() => {
    if (!isOnboardingSession) {
      return;
    }

    let unlisten: () => void;

    windowsEvents.windowDestroyed
      .listen(({ payload: { window } }) => {
        if (window.type === "video" && window.value === video) {
          stopOngoingSession();

          if (onboardingSessionId.data) {
            navigate({
              to: "/app/note/$id",
              params: { id: onboardingSessionId.data },
            });
          }
        }
      })
      .then((u) => {
        unlisten = u;
      });

    return () => unlisten?.();
  }, [isOnboardingSession, onboardingSessionId.data]);

  useEffect(() => {
    if (!isOnboardingSession) {
      return;
    }

    if (ongoingSessionStatus === "running_active") {
      windowsCommands.windowShow({ type: "video", value: video }).then(() => {
        windowsCommands.windowPosition(
          { type: "video", value: video },
          "left-half",
        );
        windowsCommands.windowPosition({ type: "main" }, "right-half");
        windowsCommands.windowResizeDefault({ type: "video", value: video });
        windowsCommands.windowResizeDefault({ type: "main" });
      });
    }

    if (ongoingSessionStatus === "inactive") {
      windowsCommands.windowDestroy({ type: "video", value: video });
    }
  }, [isOnboardingSession, ongoingSessionStatus]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <main className="flex h-full overflow-hidden bg-white">
          <div className="h-full flex-1 pt-6">
            <EditorArea
              editable={getCurrentWebviewWindowLabel() === "main"}
              sessionId={sessionId}
              onboardingSupport={onboardingSupport}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
