import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

import EditorArea from "@/components/note/editor-area";
import { useSession } from "@/contexts";
import { commands as dbCommands } from "@hypr/plugin-db";

const PATH = "/app/note/$id/main";

export const Route = createFileRoute(PATH)({
  component: Component,
});

function Component() {
  const { id: sessionId } = useParams({ from: PATH });

  const { getSession } = useSession(sessionId, (s) => ({
    sessionId: s.session.id,
    getSession: s.getSession,
  }));

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

  return (
    <main className="flex h-full overflow-hidden bg-white">
      <div className="h-full flex-1 pt-6">
        <EditorArea editable={true} sessionId={sessionId} />
      </div>
    </main>
  );
}
