import { useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";

import { SessionProvider, useRightPanel } from "@/contexts";
import EditorArea from "@/components/note/editor";

export const Route = createFileRoute("/app/note/$id")({
  component: Component,
  loader: ({ context: { queryClient }, params: { id } }) => {
    return queryClient.fetchQuery({
      queryKey: ["note", id],
      queryFn: async () => {
        let session: Session | null = null;

        try {
          const [s, _] = await Promise.all([
            dbCommands.getSession({ id }),
            dbCommands.visitSession(id),
          ]);

          session = s;
        } catch {}

        if (!session) {
          throw redirect({ to: "/app/home" });
        }

        return { session };
      },
    });
  },
});

function Component() {
  const { session } = Route.useLoaderData();
  const { hidePanel } = useRightPanel();

  useEffect(() => {
    return () => {
      hidePanel();

      const isNoteEmpty =
        (!session.raw_memo_html || session.raw_memo_html === "") &&
        !session.audio_local_path &&
        !session.audio_remote_path;

      if (isNoteEmpty) {
        dbCommands.deleteSession(session.id);
      }
    };
  }, [hidePanel, session]);

  return (
    <SessionProvider session={session}>
      <main className="flex h-full overflow-hidden bg-white">
        <div className="h-full flex-1">
          <EditorArea />
        </div>
      </main>
    </SessionProvider>
  );
}
