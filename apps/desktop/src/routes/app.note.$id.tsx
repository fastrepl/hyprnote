import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

import EditorArea from "@/components/editor-area";
import RightPanel from "@/components/right-panel";
import { useOngoingSession, useSession } from "@/contexts";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import {
  commands as windowsCommands,
  events as windowsEvents,
  getCurrentWebviewWindowLabel,
} from "@hypr/plugin-windows";

const PATH = "/app/note/$id";

export const Route = createFileRoute(PATH)({
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
          // This is needed to support case where search is performed from empty session, and come back.
          return redirect({ to: "/app/new" });
        }

        const { insert } = sessionsStore.getState();
        insert(session);

        return session;
      },
    });
  },
  loader: async ({ params: { id } }) => {
    return { isDemo: true, video: "cVEAlhaghbBcj1eZDW202URXSJq3ewZb02l7C9jG5mKrY" };
  },
  component: Component,
});

function Component() {
  const { isDemo, video } = Route.useLoaderData();
  const { id: sessionId } = useParams({ from: PATH });

  const { getSession } = useSession(sessionId, (s) => ({ getSession: s.get }));
  const { getOngoingSession, pauseOngoingSession } = useOngoingSession((s) => ({
    getOngoingSession: s.get,
    pauseOngoingSession: s.pause,
  }));

  useEffect(() => {
    if (!isDemo) {
      return;
    }

    windowsEvents.windowDestroyed.listen(({ payload }) => {
      if (payload.window.type === "video") {
        pauseOngoingSession();
      }
    });
  }, [isDemo]);

  useEffect(() => {
    const isEmpty = (s: string | null) => s === "<p></p>" || !s;

    return () => {
      const { session } = getSession();
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
  }, [getSession]);

  useEffect(() => {
    if (!isDemo) {
      return;
    }

    windowsCommands.windowShow({ type: "video", value: video }).then(() => {
      windowsCommands.windowPosition({ type: "video", value: video }, "left-half");
      windowsCommands.windowPosition({ type: "main" }, "right-half");
    });
  }, [isDemo]);

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
            <EditorArea editable={getCurrentWebviewWindowLabel() === "main"} sessionId={sessionId} />
          </div>
        </main>
      </div>
      <RightPanel />
    </div>
  );
}
