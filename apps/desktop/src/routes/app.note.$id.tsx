import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound, useMatch } from "@tanstack/react-router";
import { useEffect } from "react";

import EditorArea from "@/components/note/editor-area";
import RightPanel from "@/components/note/right-panel";
import { useSession } from "@/contexts";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";

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
          throw notFound();
        }

        const { insert } = sessionsStore.getState();
        insert(session);

        return session;
      },
    });
  },
  component: Component,
});

function Component() {
  const { params: { id: sessionId }, search: { window } } = useMatch({ from: PATH });

  const { getSession } = useSession(sessionId, (s) => ({
    sessionId: s.session.id,
    getSession: s.getSession,
  }));

  useEffect(() => {
    const isEmpty = (s: string | null) => s === "<p></p>" || !s;

    return () => {
      const session = getSession();

      const isNoteEmpty = !session.title
        && isEmpty(session.raw_memo_html)
        && isEmpty(session.enhanced_memo_html)
        && session.conversations.length === 0;

      if (isNoteEmpty) {
        mutation.mutate();
      }
    };
  }, [getSession]);

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
            <EditorArea editable={window === "main"} sessionId={sessionId} />
          </div>
        </main>
      </div>
      <RightPanel />
    </div>
  );
}
