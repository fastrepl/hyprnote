import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import EditorArea from "@/components/editor-area";
import { useHypr } from "@/contexts";
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
          throw notFound();
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

  const { getLatestSession, session } = useSession(sessionId, (s) => ({ getLatestSession: s.get, session: s.session }));
  const getOngoingSession = useOngoingSession((s) => s.get);

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

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <main className="flex h-full overflow-hidden bg-white">
          <div className="h-full flex-1 pt-6">
            <OnboardingSupport session={session} />
            <EditorArea editable={getCurrentWebviewWindowLabel() === "main"} sessionId={sessionId} />
          </div>
        </main>
      </div>
    </div>
  );
}

function OnboardingSupport({ session }: { session: Session }) {
  const video = "wGZpAB6610200nRG2uRG2t9bS1008y009RUWUJTnSlevpPc";

  const navigate = useNavigate();

  const { onboardingSessionId } = useHypr();

  const isEnhancePending = useEnhancePendingState(session.id);

  const { stopOngoingSession, ongoingSessionId, ongoingSessionStatus } = useOngoingSession((
    s,
  ) => ({
    stopOngoingSession: s.stop,
    ongoingSessionId: s.sessionId,
    ongoingSessionStatus: s.status,
  }));

  // we want to "stop-and-go-back" from anywhere, when onboarding video is destroyed.
  useEffect(() => {
    let unlisten: () => void;

    windowsEvents.windowDestroyed.listen(({ payload: { window } }) => {
      if (window.type === "video" && window.value === video) {
        stopOngoingSession();

        if (onboardingSessionId) {
          navigate({ to: "/app/note/$id", params: { id: onboardingSessionId } });
        }
      }
    }).then((u) => {
      unlisten = u;
    });

    return () => unlisten?.();
  }, []);

  useEffect(() => {
    if (onboardingSessionId !== ongoingSessionId) {
      return;
    }

    if (isEnhancePending) {
      return;
    }

    if (ongoingSessionStatus === "running_active") {
      windowsCommands.windowShow({ type: "video", value: video }).then(() => {
        windowsCommands.windowResizeDefault({ type: "video", value: video });
        windowsCommands.windowResizeDefault({ type: "main" });
      });
    }
  }, [onboardingSessionId, session.id, isEnhancePending, ongoingSessionStatus]);

  return null;
}
